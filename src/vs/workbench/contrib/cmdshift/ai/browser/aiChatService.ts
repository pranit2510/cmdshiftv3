/*---------------------------------------------------------------------------------------------
 *  Copyright (c) CmdShift AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { IAIChatService, IChatSession, IChatMessage } from '../common/aiChat.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../../platform/log/common/log.js';

export class AIChatService extends Disposable implements IAIChatService {
	declare readonly _serviceBrand: undefined;

	// Events
	private readonly _onDidChangeMessages = new Emitter<IChatSession>();
	private readonly _onDidStartStreaming = new Emitter<string>();
	private readonly _onDidEndStreaming = new Emitter<string>();

	readonly onDidChangeMessages: Event<IChatSession> = this._onDidChangeMessages.event;
	readonly onDidStartStreaming: Event<string> = this._onDidStartStreaming.event;
	readonly onDidEndStreaming: Event<string> = this._onDidEndStreaming.event;

	// State
	private sessions: IChatSession[] = [];
	private activeSessionId: string | undefined;
	private isInitialized = false;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	initialize(): void {
		try {
			if (this.isInitialized) {
				return;
			}

			// Load sessions from storage
			this.loadSessions();

			// Create default session if none exist
			if (this.sessions.length === 0) {
				this.createSession();
			}

			this.isInitialized = true;
			this.logService.info('[CmdShift] AI Chat Service initialized');
		} catch (error) {
			this.logService.error('[CmdShift] Error initializing AI Chat Service:', error);
		}
	}

	createSession(): IChatSession {
		try {
			const session: IChatSession = {
				id: generateUuid(),
				messages: [],
				createdAt: Date.now(),
				lastUpdated: Date.now()
			};

			this.sessions.push(session);
			this.activeSessionId = session.id;
			this.saveSessions();

			this.logService.info('[CmdShift] Created new chat session:', session.id);
			return session;
		} catch (error) {
			this.logService.error('[CmdShift] Error creating session:', error);
			// Return a fallback session to prevent crashes
			const fallbackSession: IChatSession = {
				id: 'fallback-' + Date.now(),
				messages: [],
				createdAt: Date.now(),
				lastUpdated: Date.now()
			};
			return fallbackSession;
		}
	}

	getActiveSession(): IChatSession | undefined {
		try {
			if (!this.activeSessionId) {
				return this.sessions[0];
			}
			return this.sessions.find(s => s.id === this.activeSessionId) || this.sessions[0];
		} catch (error) {
			this.logService.error('[CmdShift] Error getting active session:', error);
			return undefined;
		}
	}

	setActiveSession(sessionId: string): void {
		try {
			const session = this.sessions.find(s => s.id === sessionId);
			if (session) {
				this.activeSessionId = sessionId;
				this.logService.info('[CmdShift] Set active session:', sessionId);
			}
		} catch (error) {
			this.logService.error('[CmdShift] Error setting active session:', error);
		}
	}

	deleteSession(sessionId: string): void {
		try {
			const index = this.sessions.findIndex(s => s.id === sessionId);
			if (index !== -1) {
				this.sessions.splice(index, 1);

				// If deleted session was active, set new active session
				if (this.activeSessionId === sessionId) {
					this.activeSessionId = this.sessions.length > 0 ? this.sessions[0].id : undefined;
				}

				// Create new session if no sessions remain
				if (this.sessions.length === 0) {
					this.createSession();
				}

				this.saveSessions();
				this.logService.info('[CmdShift] Deleted session:', sessionId);
			}
		} catch (error) {
			this.logService.error('[CmdShift] Error deleting session:', error);
		}
	}

	getAllSessions(): IChatSession[] {
		try {
			return [...this.sessions]; // Return copy to prevent external modifications
		} catch (error) {
			this.logService.error('[CmdShift] Error getting all sessions:', error);
			return [];
		}
	}

	async sendMessage(content: string, fileContext?: URI): Promise<void> {
		try {
			if (!content.trim()) {
				return;
			}

			const session = this.getActiveSession();
			if (!session) {
				this.logService.warn('[CmdShift] No active session for sending message');
				return;
			}

			// Add user message
			const userMessage: IChatMessage = {
				id: generateUuid(),
				role: 'user',
				content: content.trim(),
				timestamp: Date.now(),
				fileContext
			};

			session.messages.push(userMessage);
			session.lastUpdated = Date.now();

			// Notify listeners
			this._onDidChangeMessages.fire(session);

			// Add AI response (simplified for now)
			const responseMessage: IChatMessage = {
				id: generateUuid(),
				role: 'assistant',
				content: 'I received your message: "' + content + '". AI chat functionality is coming soon!',
				timestamp: Date.now(),
				isStreaming: false
			};

			// Simulate slight delay for AI response
			setTimeout(() => {
				try {
					session.messages.push(responseMessage);
					session.lastUpdated = Date.now();
					this.saveSessions();
					this._onDidChangeMessages.fire(session);
				} catch (error) {
					this.logService.error('[CmdShift] Error adding AI response:', error);
				}
			}, 500);

			this.saveSessions();
			this.logService.info('[CmdShift] Sent message to AI Chat');

		} catch (error) {
			this.logService.error('[CmdShift] Error sending message:', error);
		}
	}

	cancelStreaming(messageId: string): void {
		try {
			// Implementation for canceling streaming responses
			this._onDidEndStreaming.fire(messageId);
			this.logService.info('[CmdShift] Canceled streaming for message:', messageId);
		} catch (error) {
			this.logService.error('[CmdShift] Error canceling streaming:', error);
		}
	}

	clearMessages(sessionId?: string): void {
		try {
			const targetSessionId = sessionId || this.activeSessionId;
			const session = this.sessions.find(s => s.id === targetSessionId);

			if (session) {
				session.messages = [];
				session.lastUpdated = Date.now();
				this.saveSessions();
				this._onDidChangeMessages.fire(session);
				this.logService.info('[CmdShift] Cleared messages for session:', targetSessionId);
			}
		} catch (error) {
			this.logService.error('[CmdShift] Error clearing messages:', error);
		}
	}

	private loadSessions(): void {
		try {
			const sessionsData = this.storageService.get('cmdshift.aiChat.sessions', StorageScope.PROFILE);
			if (sessionsData) {
				const parsed = JSON.parse(sessionsData);
				this.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
				this.activeSessionId = parsed.activeSessionId;
			}
		} catch (error) {
			this.logService.warn('[CmdShift] Error loading sessions from storage, starting fresh:', error);
			this.sessions = [];
			this.activeSessionId = undefined;
		}
	}

	private saveSessions(): void {
		try {
			const data = {
				sessions: this.sessions,
				activeSessionId: this.activeSessionId
			};
			this.storageService.store('cmdshift.aiChat.sessions', JSON.stringify(data), StorageScope.PROFILE, StorageTarget.USER);
		} catch (error) {
			this.logService.error('[CmdShift] Error saving sessions to storage:', error);
		}
	}

	override dispose(): void {
		try {
			this._onDidChangeMessages.dispose();
			this._onDidStartStreaming.dispose();
			this._onDidEndStreaming.dispose();
			super.dispose();
		} catch (error) {
			this.logService.error('[CmdShift] Error disposing AI Chat Service:', error);
		}
	}
}

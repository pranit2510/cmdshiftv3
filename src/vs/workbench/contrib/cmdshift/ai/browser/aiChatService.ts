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

const STORAGE_KEY_SESSIONS = 'cmdshift.aiChat.sessions';
const STORAGE_KEY_ACTIVE_SESSION = 'cmdshift.aiChat.activeSession';

export class AIChatService extends Disposable implements IAIChatService {
	declare readonly _serviceBrand: undefined;

	private sessions: Map<string, IChatSession> = new Map();
	private activeSessionId: string | undefined;

	private readonly _onDidChangeMessages = this._register(new Emitter<IChatSession>());
	readonly onDidChangeMessages: Event<IChatSession> = this._onDidChangeMessages.event;

	private readonly _onDidStartStreaming = this._register(new Emitter<string>());
	readonly onDidStartStreaming: Event<string> = this._onDidStartStreaming.event;

	private readonly _onDidEndStreaming = this._register(new Emitter<string>());
	readonly onDidEndStreaming: Event<string> = this._onDidEndStreaming.event;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	initialize(): void {
		this.loadSessions();
		if (this.sessions.size === 0) {
			const session = this.createSession();
			this.setActiveSession(session.id);
		}
	}

	createSession(): IChatSession {
		const session: IChatSession = {
			id: generateUuid(),
			messages: [],
			createdAt: Date.now(),
			lastUpdated: Date.now()
		};
		this.sessions.set(session.id, session);
		this.saveSessions();
		return session;
	}

	getActiveSession(): IChatSession | undefined {
		console.log('[CmdShift] Getting active session, current ID:', this.activeSessionId);

		if (!this.activeSessionId || !this.sessions.has(this.activeSessionId)) {
			// Create a default session if none exists
			console.log('[CmdShift] No active session, creating default');
			this.activeSessionId = this.createSession().id;
		}

		const session = this.sessions.get(this.activeSessionId);
		console.log('[CmdShift] Returning session:', session);
		return session;
	}

	setActiveSession(sessionId: string): void {
		if (this.sessions.has(sessionId)) {
			this.activeSessionId = sessionId;
			this.storageService.store(STORAGE_KEY_ACTIVE_SESSION, sessionId, StorageScope.WORKSPACE, StorageTarget.USER);
		}
	}

	deleteSession(sessionId: string): void {
		this.sessions.delete(sessionId);
		if (this.activeSessionId === sessionId) {
			this.activeSessionId = undefined;
			// Create a new session if no sessions left
			if (this.sessions.size === 0) {
				const session = this.createSession();
				this.setActiveSession(session.id);
			} else {
				// Set the first available session as active
				this.activeSessionId = this.sessions.keys().next().value;
			}
		}
		this.saveSessions();
	}

	getAllSessions(): IChatSession[] {
		return Array.from(this.sessions.values());
	}

	async sendMessage(message: string, fileContext?: URI): Promise<void> {
		console.log('[CmdShift] Sending message:', message);

		const session = this.getActiveSession();
		if (!session) {
			console.error('[CmdShift] No active session!');
			return;
		}

		const userMessage: IChatMessage = {
			id: `msg_${Date.now()}_user`,  // Ensure ID exists
			role: 'user',
			content: message,
			timestamp: Date.now(),
			fileContext
		};

		session.messages.push(userMessage);
		this._onDidChangeMessages.fire(session);

		// Simulate AI response
		setTimeout(() => {
			const aiMessage: IChatMessage = {
				id: `msg_${Date.now()}_ai`,  // Ensure ID exists
				role: 'assistant',
				content: `Echo: ${message}`,
				timestamp: Date.now(),
				isStreaming: false
			};

			session.messages.push(aiMessage);
			this._onDidChangeMessages.fire(session);
		}, 1000);
	}

	cancelStreaming(messageId: string): void {
		const session = this.getActiveSession();
		if (!session) return;

		const message = session.messages.find(m => m.id === messageId);
		if (message && message.isStreaming) {
			message.isStreaming = false;
			message.content += '\n\n[Response cancelled]';
			this._onDidEndStreaming.fire(messageId);
			this._onDidChangeMessages.fire(session);
			this.saveSessions();
		}
	}

	clearMessages(sessionId?: string): void {
		const id = sessionId || this.activeSessionId;
		if (!id) return;

		const session = this.sessions.get(id);
		if (session) {
			session.messages = [];
			session.lastUpdated = Date.now();
			this._onDidChangeMessages.fire(session);
			this.saveSessions();
		}
	}

	private loadSessions(): void {
		try {
			const storedSessions = this.storageService.get(STORAGE_KEY_SESSIONS, StorageScope.WORKSPACE);
			if (storedSessions) {
				const sessionsArray: IChatSession[] = JSON.parse(storedSessions);
				this.sessions.clear();
				for (const session of sessionsArray) {
					this.sessions.set(session.id, session);
				}
			}

			const activeSession = this.storageService.get(STORAGE_KEY_ACTIVE_SESSION, StorageScope.WORKSPACE);
			if (activeSession && this.sessions.has(activeSession)) {
				this.activeSessionId = activeSession;
			}
		} catch (error) {
			this.logService.error('Failed to load AI chat sessions', error);
		}
	}

	private saveSessions(): void {
		try {
			const sessionsArray = Array.from(this.sessions.values());
			this.storageService.store(
				STORAGE_KEY_SESSIONS,
				JSON.stringify(sessionsArray),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);
		} catch (error) {
			this.logService.error('Failed to save AI chat sessions', error);
		}
	}

	override dispose(): void {
		this.saveSessions();
		super.dispose();
	}
}

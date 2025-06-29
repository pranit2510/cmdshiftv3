/*---------------------------------------------------------------------------------------------
 *  Copyright (c) CmdShift AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../../base/common/event.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../../base/common/uri.js';

export const IAIChatService = createDecorator<IAIChatService>('aiChatService');

export interface IChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	fileContext?: URI;
	isStreaming?: boolean;
}

export interface IChatSession {
	id: string;
	messages: IChatMessage[];
	createdAt: number;
	lastUpdated: number;
}

export interface IAIChatService {
	readonly _serviceBrand: undefined;

	// Events
	readonly onDidChangeMessages: Event<IChatSession>;
	readonly onDidStartStreaming: Event<string>; // message id
	readonly onDidEndStreaming: Event<string>; // message id

	// Session Management
	createSession(): IChatSession;
	getActiveSession(): IChatSession | undefined;
	setActiveSession(sessionId: string): void;
	deleteSession(sessionId: string): void;
	getAllSessions(): IChatSession[];

	// Message Management
	sendMessage(content: string, fileContext?: URI): Promise<void>;
	cancelStreaming(messageId: string): void;
	clearMessages(sessionId?: string): void;

	// Service Lifecycle
	initialize(): void;
	dispose(): void;
}

export interface IAIChatProvider {
	readonly id: string;
	readonly name: string;
	sendMessage(message: string, context?: any): AsyncIterable<string>;
	cancelRequest(requestId: string): void;
}
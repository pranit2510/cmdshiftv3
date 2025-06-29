/*---------------------------------------------------------------------------------------------
 *  Copyright (c) CmdShift AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ViewPane, IViewPaneOptions } from '../../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IAIChatService } from '../common/aiChat.js';
import { IWebviewService, IWebviewElement } from '../../../../contrib/webview/browser/webview.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { $, append, getWindow } from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';

export class AIChatViewPane extends ViewPane {
	static readonly ID = 'cmdshift.aiChatView';
	static readonly TITLE = localize('aiChat', "AI Chat");

	private webview: IWebviewElement | undefined;
	private readonly disposables = new DisposableStore();

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IAIChatService private readonly aiChatService: IAIChatService,
		@IWebviewService private readonly webviewService: IWebviewService,
		@IEditorService private readonly editorService: IEditorService
	) {
		// Ensure options has required id property
		const viewOptions: IViewPaneOptions = options || { id: AIChatViewPane.ID, title: AIChatViewPane.TITLE };
		const safeOptions: IViewPaneOptions = {
			...viewOptions,
			id: viewOptions.id || AIChatViewPane.ID,
			title: viewOptions.title || AIChatViewPane.TITLE
		};
		super(safeOptions, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const webviewContainer = append(container, $('.ai-chat-webview-container'));

		this.webview = this.webviewService.createWebviewElement({
			title: 'CmdShift AI Chat',
			options: {
				enableFindWidget: false
			},
			contentOptions: {
				allowScripts: true,
			},
			extension: undefined,
			origin: AIChatViewPane.ID
		});

		this.webview.setHtml(this.getWebviewContent());

		// Mount webview to container
		const targetWindow = getWindow(this.element);
		this.webview.mountTo(webviewContainer, targetWindow);

		// Handle webview messages
		this.disposables.add(this.webview.onMessage((e: any) => {
			switch (e.type) {
				case 'ready':
					this.updateWebview();
					break;
				case 'sendMessage':
					this.handleSendMessage(e.message);
					break;
			}
		}));

		// Listen to AI Chat service events
		this.disposables.add(this.aiChatService.onDidChangeMessages(() => this.updateWebview()));

		// Listen to editor changes
		this.disposables.add(this.editorService.onDidActiveEditorChange(() => this.updateFileContext()));
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		// Webview will automatically resize with its container
	}

	private async handleSendMessage(message: string): Promise<void> {
		const activeEditor = this.editorService.activeEditor;
		const fileUri = activeEditor?.resource;
		await this.aiChatService.sendMessage(message, fileUri);
	}

	private updateWebview(): void {
		if (!this.webview) {
			return;
		}

		const session = this.aiChatService.getActiveSession();
		const messages = session?.messages || [];

		// Add logging to debug
		console.log('[CmdShift] Session:', session);
		console.log('[CmdShift] Messages:', messages);

		this.webview.postMessage({
			type: 'updateMessages',
			messages: messages.map((m: any) => ({
				id: m?.id || Date.now().toString(),  // Add fallback
				role: m?.role || 'user',
				content: m?.content || '',
				timestamp: m?.timestamp || Date.now(),
				isStreaming: m?.isStreaming || false
			}))
		});
	}

	private updateFileContext(): void {
		if (!this.webview) {
			return;
		}

		const activeEditor = this.editorService.activeEditor;
		const fileName = activeEditor?.resource?.fsPath || 'No file active';

		this.webview.postMessage({
			type: 'updateFileContext',
			fileName
		});
	}

	private getWebviewContent(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>CmdShift AI Chat</title>
	<style>
		body {
			margin: 0;
			padding: 0;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			overflow: hidden;
		}

		#chat-container {
			display: flex;
			flex-direction: column;
			height: 100vh;
		}

		#file-context {
			padding: 8px 16px;
			background-color: var(--vscode-sideBar-background);
			border-bottom: 1px solid var(--vscode-panel-border);
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}

		#messages {
			flex: 1;
			overflow-y: auto;
			padding: 16px;
		}

		.message {
			margin-bottom: 16px;
			padding: 12px;
			border-radius: 6px;
			background-color: var(--vscode-editor-inactiveSelectionBackground);
		}

		.message.user {
			background-color: var(--vscode-editor-selectionBackground);
			margin-left: 20%;
		}

		.message.assistant {
			margin-right: 20%;
		}

		.message-role {
			font-weight: bold;
			margin-bottom: 8px;
			color: var(--vscode-textLink-foreground);
		}

		.message-content {
			line-height: 1.5;
		}

		.message-content code {
			background-color: var(--vscode-textCodeBlock-background);
			padding: 2px 4px;
			border-radius: 3px;
			font-family: var(--vscode-editor-font-family);
		}

		.message-content pre {
			background-color: var(--vscode-textCodeBlock-background);
			padding: 12px;
			border-radius: 4px;
			overflow-x: auto;
			margin: 8px 0;
			border: 1px solid var(--vscode-panel-border);
		}

		.message-content pre.code-block {
			position: relative;
		}

		.message-content pre.code-block::before {
			content: attr(data-language);
			position: absolute;
			top: 0;
			right: 0;
			padding: 4px 8px;
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
			background-color: var(--vscode-badge-background);
			border-bottom-left-radius: 4px;
		}

		#input-container {
			padding: 16px;
			border-top: 1px solid var(--vscode-panel-border);
			display: flex;
			gap: 8px;
		}

		#message-input {
			flex: 1;
			padding: 8px 12px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			resize: none;
			min-height: 36px;
			max-height: 120px;
		}

		#message-input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			border-color: var(--vscode-focusBorder);
		}

		#send-button {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			white-space: nowrap;
		}

		#send-button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}

		#send-button:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		.streaming-indicator {
			display: inline-block;
			margin-left: 8px;
		}

		.streaming-indicator::after {
			content: '...';
			animation: dots 1.5s steps(4, end) infinite;
		}

		@keyframes dots {
			0%, 20% { content: ''; }
			40% { content: '.'; }
			60% { content: '..'; }
			80%, 100% { content: '...'; }
		}
	</style>
</head>
<body>
	<div id="chat-container">
		<div id="file-context">
			<span>Context: </span><span id="file-path"></span>
		</div>
		<div id="messages"></div>
		<div id="input-container">
			<textarea id="message-input" placeholder="Ask CmdShift AI..." rows="1"></textarea>
			<button id="send-button">Send</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const messagesContainer = document.getElementById('messages');
		const messageInput = document.getElementById('message-input');
		const sendButton = document.getElementById('send-button');
		const fileContext = document.getElementById('file-context');
		const filePath = document.getElementById('file-path');

		let messages = [];

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.type) {
				case 'updateMessages':
					messages = message.messages;
					renderMessages();
					break;
				case 'updateFileContext':
					filePath.textContent = message.fileName;
					break;
			}
		});

		// Send message
		function sendMessage() {
			const messageInput = document.getElementById('message-input');
			const content = messageInput.value.trim();

			if (!content) return;

			console.log('[CmdShift Webview] Sending message:', content);

			vscode.postMessage({
				type: 'sendMessage',
				message: content,
				fileContext: filePath.textContent
			});

			messageInput.value = '';
			adjustTextareaHeight();
		}

		// Render messages
		function renderMessages() {
			messagesContainer.innerHTML = '';
			messages.forEach(msg => {
				const messageEl = document.createElement('div');
				messageEl.className = 'message ' + msg.role;

				const roleEl = document.createElement('div');
				roleEl.className = 'message-role';
				roleEl.textContent = msg.role === 'user' ? 'You' : 'CmdShift AI';

				const contentEl = document.createElement('div');
				contentEl.className = 'message-content';
				contentEl.innerHTML = formatContent(msg.content);

				if (msg.isStreaming) {
					const indicator = document.createElement('span');
					indicator.className = 'streaming-indicator';
					contentEl.appendChild(indicator);
				}

				messageEl.appendChild(roleEl);
				messageEl.appendChild(contentEl);
				messagesContainer.appendChild(messageEl);
			});

			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}

		// Format message content with code blocks and syntax highlighting
		function formatContent(content) {
			// Handle code blocks with language detection
			content = content.replace(/\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g, function(match, lang, code) {
				const language = lang || 'plaintext';
				const escapedCode = escapeHtml(code.trim());
				return '<pre class="code-block" data-language="' + language + '"><code>' + escapedCode + '</code></pre>';
			});

			// Handle inline code
			content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');

			// Handle line breaks
			content = content.replace(/\n/g, '<br>');

			return content;
		}

		// Escape HTML to prevent XSS
		function escapeHtml(str) {
			return str
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');
		}

		// Auto-resize textarea
		function adjustTextareaHeight() {
			messageInput.style.height = 'auto';
			messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
		}

		// Event listeners
		sendButton.addEventListener('click', sendMessage);
		messageInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		});
		messageInput.addEventListener('input', adjustTextareaHeight);

		// Notify extension that webview is ready
		vscode.postMessage({ type: 'ready' });
	</script>
</body>
</html>`;
	}

	override dispose(): void {
		this.disposables.dispose();
		this.webview?.dispose();
		super.dispose();
	}
}

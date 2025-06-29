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
	static readonly TITLE = localize('commandMe', "Command me");

	private webview: IWebviewElement | undefined;
	private readonly disposables = new DisposableStore();
	private isWebviewInitialized = false;

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
		// Ensure options has required id property with error handling
		const viewOptions: IViewPaneOptions = options || { id: AIChatViewPane.ID, title: AIChatViewPane.TITLE };
		const safeOptions: IViewPaneOptions = {
			...viewOptions,
			id: viewOptions.id || AIChatViewPane.ID,
			title: viewOptions.title || AIChatViewPane.TITLE
		};

		// Super call must be at root level
		super(safeOptions, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

		// Additional initialization with error handling
		try {
			console.log('[CmdShift] AIChatViewPane constructor completed');
		} catch (error) {
			console.error('[CmdShift] Error in AIChatViewPane constructor:', error);
		}
	}

	protected override renderBody(container: HTMLElement): void {
		try {
			super.renderBody(container);

			// Only create webview once
			if (!this.isWebviewInitialized) {
				const webviewContainer = append(container, $('.ai-chat-webview-container'));

				this.webview = this.webviewService.createWebviewElement({
					title: 'Command me',
					options: {
						enableFindWidget: false,
						retainContextWhenHidden: true
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
					try {
						switch (e.type) {
							case 'ready':
								this.updateWebview();
								this.updateFileContext();
								break;
							case 'sendMessage':
								this.handleSendMessage(e.message);
								break;
							case 'viewAllChats':
								console.log('[CmdShift] View all chats clicked');
								break;
						}
					} catch (error) {
						console.error('[CmdShift] Error handling webview message:', error);
					}
				}));

				// Listen to AI Chat service events
				this.disposables.add(this.aiChatService.onDidChangeMessages(() => {
					try {
						this.updateWebview();
					} catch (error) {
						console.error('[CmdShift] Error updating webview on message change:', error);
					}
				}));

				// Listen to editor changes
				this.disposables.add(this.editorService.onDidActiveEditorChange(() => {
					try {
						this.updateFileContext();
					} catch (error) {
						console.error('[CmdShift] Error updating file context:', error);
					}
				}));

				this.isWebviewInitialized = true;
			}

			// Always update on render to ensure fresh state
			this.updateWebview();
			this.updateFileContext();
		} catch (error) {
			console.error('[CmdShift] Error in renderBody:', error);
		}
	}

	protected override layoutBody(height: number, width: number): void {
		try {
			super.layoutBody(height, width);
			// Webview will automatically resize with its container
		} catch (error) {
			console.error('[CmdShift] Error in layoutBody:', error);
		}
	}

	private async handleSendMessage(message: string): Promise<void> {
		try {
			const activeEditor = this.editorService.activeEditor;
			const fileUri = activeEditor?.resource;
			await this.aiChatService.sendMessage(message, fileUri);
		} catch (error) {
			console.error('[CmdShift] Error sending message:', error);
		}
	}

	private updateWebview(): void {
		try {
			if (!this.webview) {
				return;
			}

			const session = this.aiChatService.getActiveSession();
			const messages = session?.messages || [];
			const allSessions = this.aiChatService.getAllSessions();

			this.webview.postMessage({
				type: 'updateMessages',
				messages: messages.map((m: any) => ({
					id: m?.id || Date.now().toString(),
					role: m?.role || 'user',
					content: m?.content || '',
					timestamp: m?.timestamp || Date.now(),
					isStreaming: m?.isStreaming || false
				})),
				sessions: allSessions.map(s => ({
					id: s.id,
					title: s.messages.length > 0 ? s.messages[0].content.substring(0, 30) + '...' : 'New Chat',
					timestamp: s.lastUpdated
				}))
			});
		} catch (error) {
			console.error('[CmdShift] Error updating webview:', error);
		}
	}

	private updateFileContext(): void {
		try {
			if (!this.webview) {
				return;
			}

			const activeEditor = this.editorService.activeEditor;
			const fileName = activeEditor?.resource?.fsPath || 'No file active';

			this.webview.postMessage({
				type: 'updateFileContext',
				fileName
			});
		} catch (error) {
			console.error('[CmdShift] Error updating file context:', error);
		}
	}

	private getWebviewContent(): string {
		// Simplified HTML to reduce potential syntax errors
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Command me</title>
	<style>
		body {
			margin: 0;
			padding: 16px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
			color: var(--vscode-foreground);
			background-color: var(--vscode-sideBar-background);
		}

		.container {
			display: flex;
			flex-direction: column;
			height: calc(100vh - 32px);
		}

		.header {
			margin-bottom: 16px;
			padding-bottom: 8px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}

		.messages {
			flex: 1;
			overflow-y: auto;
			margin-bottom: 16px;
		}

		.message {
			margin-bottom: 12px;
			padding: 8px;
			border-radius: 4px;
		}

		.user-message {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}

		.ai-message {
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
		}

		.input-container {
			display: flex;
			gap: 8px;
		}

		.input {
			flex: 1;
			padding: 8px;
			border: 1px solid var(--vscode-input-border);
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border-radius: 4px;
		}

		.send-button {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
		}

		.send-button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h3>Command me</h3>
			<div id="fileContext">No file active</div>
		</div>

		<div class="messages" id="messages">
			<div class="message ai-message">
				Welcome to Command me! Ask me anything about your code.
			</div>
		</div>

		<div class="input-container">
			<input type="text" class="input" id="messageInput" placeholder="Ask me anything..." />
			<button class="send-button" id="sendButton">Send</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		document.getElementById('sendButton').addEventListener('click', sendMessage);
		document.getElementById('messageInput').addEventListener('keypress', function(e) {
			if (e.key === 'Enter') {
				sendMessage();
			}
		});

		function sendMessage() {
			const input = document.getElementById('messageInput');
			const message = input.value.trim();
			if (message) {
				vscode.postMessage({
					type: 'sendMessage',
					message: message
				});
				input.value = '';
			}
		}

		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.type) {
				case 'updateMessages':
					updateMessages(message.messages);
					break;
				case 'updateFileContext':
					updateFileContext(message.fileName);
					break;
			}
		});

		function updateMessages(messages) {
			const container = document.getElementById('messages');
			container.innerHTML = '';

			if (messages.length === 0) {
				container.innerHTML = '<div class="message ai-message">Welcome to Command me! Ask me anything about your code.</div>';
				return;
			}

			messages.forEach(msg => {
				const div = document.createElement('div');
				div.className = 'message ' + (msg.role === 'user' ? 'user-message' : 'ai-message');
				div.textContent = msg.content;
				container.appendChild(div);
			});

			container.scrollTop = container.scrollHeight;
		}

		function updateFileContext(fileName) {
			document.getElementById('fileContext').textContent = fileName;
		}

		// Notify ready
		vscode.postMessage({ type: 'ready' });
	</script>
</body>
</html>`;
	}

	override dispose(): void {
		try {
			this.disposables.dispose();
			super.dispose();
		} catch (error) {
			console.error('[CmdShift] Error disposing AIChatViewPane:', error);
		}
	}
}

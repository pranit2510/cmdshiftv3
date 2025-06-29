/*---------------------------------------------------------------------------------------------
 *  Copyright (c) CmdShift AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../../nls.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from '../../../../common/contributions.js';
import { LifecyclePhase } from '../../../../services/lifecycle/common/lifecycle.js';
import { AIChatViewPane } from './aiChatView.js';
import { IViewContainersRegistry, IViewsRegistry, Extensions as ViewExtensions, ViewContainerLocation } from '../../../../common/views.js';
import { AIChatService } from './aiChatService.js';
import { IAIChatService } from '../common/aiChat.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { KeybindingsRegistry, KeybindingWeight } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyCode, KeyMod } from '../../../../../base/common/keyCodes.js';
// import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';

// Register AI Chat icon
const aiChatIcon = registerIcon('cmdshift-ai-chat', Codicon.commentDiscussion, localize('aiChatIcon', 'Icon for AI Chat panel'));

// Register AI Chat Service
registerSingleton(IAIChatService, AIChatService, InstantiationType.Delayed);

// AI Chat View ID
export const AI_CHAT_VIEW_ID = 'workbench.panel.aiChat';

// Register AI Chat View Container
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: AI_CHAT_VIEW_ID,
	title: { value: 'AI Chat', original: 'AI Chat' },
	icon: aiChatIcon,
	ctorDescriptor: new SyncDescriptor(AIChatViewPane),
	order: 3,
	hideIfEmpty: false,
	alwaysUseContainerInfo: true,
}, ViewContainerLocation.Panel, { doNotRegisterOpenCommand: true });

// Right before the view registration
console.log('[CmdShift] About to register views...');

// Register AI Chat View
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: AI_CHAT_VIEW_ID,
	name: localize2('aiChat.name', "AI Chat"),
	containerIcon: aiChatIcon,
	canToggleVisibility: true,
	canMoveView: true,
	weight: 30,
	order: 3,
	ctorDescriptor: new SyncDescriptor(AIChatViewPane),
	openCommandActionDescriptor: {
		id: 'workbench.action.aiChat.focus',
		mnemonicTitle: localize({ key: 'miToggleAIChat', comment: ['&& denotes a mnemonic'] }, "&&AI Chat"),
		keybindings: {
			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyA,
		},
		order: 3,
	}
}], VIEW_CONTAINER);

// Register Commands
const TOGGLE_AI_CHAT_COMMAND_ID = 'workbench.action.aiChat.toggle';

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: TOGGLE_AI_CHAT_COMMAND_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyA,
	handler: async (accessor: ServicesAccessor) => {
		try {
			console.log('[CmdShift] Toggle command triggered');
			const viewsService = accessor.get(IViewsService);
			const aiChatService = accessor.get(IAIChatService);
			console.log('[CmdShift] Services retrieved:', { viewsService: !!viewsService, aiChatService: !!aiChatService });
			if (viewsService.isViewVisible(AI_CHAT_VIEW_ID)) {
				viewsService.closeView(AI_CHAT_VIEW_ID);
			} else {
				await viewsService.openView(AI_CHAT_VIEW_ID, true);
			}
		} catch (error) {
			console.error('[CmdShift] Error opening AI Chat:', error);
			throw error;
		}
	}
});

// Register Workbench Contribution
class AIChatContribution {
	constructor(
		// @ICommandService private readonly commandService: ICommandService,
		@IAIChatService private readonly aiChatService: IAIChatService
	) {
		// Initialize AI Chat when workbench starts
		this.aiChatService.initialize();
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
	AIChatContribution,
	LifecyclePhase.Restored
);

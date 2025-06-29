/*---------------------------------------------------------------------------------------------
 *  Copyright (c) CmdShift AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../../nls.js';
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
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../../browser/parts/views/viewPaneContainer.js';
import { ILocalizedString } from '../../../../../platform/action/common/action.js';

// AI Chat View ID - moved outside try block to export properly
export const AI_CHAT_VIEW_ID = 'workbench.view.cmdshift.aiChat';

// Wrap everything in try-catch to prevent failures from breaking the workbench
try {
	// Register AI Chat icon
	const aiChatIcon = registerIcon('cmdshift-ai-chat', Codicon.commentDiscussion, localize('aiChatIcon', 'Icon for Command me'));

	// Register AI Chat Service
	registerSingleton(IAIChatService, AIChatService, InstantiationType.Delayed);

	// Create localized strings properly
	const commandMeContainer: ILocalizedString = { value: 'Command me', original: 'Command me' };
	const commandMeView: ILocalizedString = { value: 'Command me', original: 'Command me' };

	// Register AI Chat View Container in Auxiliary Bar (right sidebar) - like Cursor
	const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
		id: 'workbench.view.extension.cmdshift-ai',
		title: commandMeContainer,
		icon: aiChatIcon,
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['workbench.view.extension.cmdshift-ai', { mergeViewWithContainerWhenSingleView: true }]),
		hideIfEmpty: false,
		order: 1
	}, ViewContainerLocation.AuxiliaryBar);

	// Register AI Chat View
	Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
		id: AI_CHAT_VIEW_ID,
		name: commandMeView,
		ctorDescriptor: new SyncDescriptor(AIChatViewPane),
		canToggleVisibility: true,
		canMoveView: true,
		containerIcon: aiChatIcon,
		order: 0,
		openCommandActionDescriptor: {
			id: 'workbench.action.commandMe.focus',
			mnemonicTitle: localize('miToggleCommandMe', "Command me"),
			keybindings: {
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI,
			},
			order: 1,
		}
	}], VIEW_CONTAINER);

	// Register Commands with unique IDs to avoid conflicts
	const TOGGLE_AI_CHAT_COMMAND_ID = 'workbench.action.cmdshift.commandMe.toggle';
	const FOCUS_AI_CHAT_COMMAND_ID = 'workbench.action.cmdshift.commandMe.focus';

	// Toggle command
	KeybindingsRegistry.registerCommandAndKeybindingRule({
		id: TOGGLE_AI_CHAT_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI,
		handler: async (accessor: ServicesAccessor) => {
			try {
				const viewsService = accessor.get(IViewsService);
				if (viewsService.isViewVisible(AI_CHAT_VIEW_ID)) {
					viewsService.closeView(AI_CHAT_VIEW_ID);
				} else {
					await viewsService.openView(AI_CHAT_VIEW_ID, true);
				}
			} catch (error) {
				console.error('[CmdShift] Error toggling AI Chat:', error);
			}
		}
	});

	// Focus command (for menu integration)
	KeybindingsRegistry.registerCommandAndKeybindingRule({
		id: FOCUS_AI_CHAT_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		handler: async (accessor: ServicesAccessor) => {
			try {
				const viewsService = accessor.get(IViewsService);
				await viewsService.openView(AI_CHAT_VIEW_ID, true);
			} catch (error) {
				console.error('[CmdShift] Error focusing AI Chat:', error);
			}
		}
	});

	// Register Workbench Contribution with error handling
	class AIChatContribution {
		constructor(
			@IAIChatService private readonly aiChatService: IAIChatService
		) {
			try {
				// Initialize AI Chat when workbench starts
				this.aiChatService.initialize();
				console.log('[CmdShift] AI Chat contribution initialized successfully');
			} catch (error) {
				console.error('[CmdShift] Error initializing AI Chat service:', error);
			}
		}
	}

	Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
		AIChatContribution,
		LifecyclePhase.Restored
	);

} catch (error) {
	console.error('[CmdShift] Critical error in AI contribution:', error);
	// Don't throw - just log and continue to prevent breaking the workbench
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) CmdShift AI. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AIChatService } from './aiChatService.js';
import { IAIChatService } from '../common/aiChat.js';
import { InstantiationType, registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { KeyCode, KeyMod } from '../../../../../base/common/keyCodes.js';
import { KeybindingsRegistry, KeybindingWeight } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';

// Removed unused aiChatIcon registration

// Register AI Chat Service
registerSingleton(IAIChatService, AIChatService, InstantiationType.Delayed);

// AI Chat View ID
export const AI_CHAT_VIEW_ID = 'workbench.view.cmdshift.aiChat';

// AI Chat Command ID
export const TOGGLE_AI_CHAT_COMMAND_ID = 'workbench.action.cmdshift.toggleAIChat';

// Comment out view container registration to remove AI Chat from Activity Bar
/*
// Register AI Chat View Container
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: 'workbench.view.extension.cmdshift-ai',
	title: localize2('aiChat.container', 'AI Chat'),
	icon: aiChatIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['workbench.view.extension.cmdshift-ai', { mergeViewWithContainerWhenSingleView: true }]),
	hideIfEmpty: false,
	order: 2
}, ViewContainerLocation.Sidebar);

// Register views
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: AI_CHAT_VIEW_ID,
	name: localize2('aiChat.view', 'AI Chat'),
	ctorDescriptor: new SyncDescriptor(AIChatViewPane),
	canToggleVisibility: true,
	canMoveView: true,
	containerIcon: aiChatIcon,
	order: 0,
	when: ContextKeyExpr.true()
}], VIEW_CONTAINER);
*/

// Comment out workbench contribution - no longer needed for right panel approach
/*
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
*/

// Register the toggle command
KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: TOGGLE_AI_CHAT_COMMAND_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyI,
	handler: async (accessor: ServicesAccessor) => {
		// This can trigger the right panel AI Chat if needed
		console.log('[CmdShift] AI Chat command triggered');
		// Add code here to open the right panel if desired
	}
});

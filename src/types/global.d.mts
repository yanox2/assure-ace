/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Global ambient declare
 *      グローバル宣言
 *---------------------------------------------------------------------------*/

declare global{
	// windowオブジェクトの型拡張
	interface Window{
		browserNo: number;
		AABridge:{
			launch: (url: string) => void;
			play: () => void;
			record: (state: boolean) => void;
			menuTestStep: (no: number, menu: number) => Promise<IPCResponse>;
			editTestStep: (postData: string) => Promise<IPCResponse>;
			editTestStepSp: (postData: string) => Promise<IPCResponse>;
			editSettings: (postData: string) => Promise<IPCResponse>;
			alert: (type: number, message: string, title?: string) => Promise<void>;
			message: (type: number, message: string, title?: string) => void;
			testSend: (no: number, op: Operation) => Promise<string>;
		};
	}

	interface IPCResponse{
		rcode: number;
		message: string;
		[key: string]: unknown;
	}

	interface EventContext{
		tagName: string;
		id: string;
		text: string;
		name: string;
		type: string;
		value: string;
		label: string;
		dataId: string;
		offsetX: number;
		offsetY: number;
	}

	interface Operation{
		version: string;
		id: number;
		browserNo: number;
		tabNo: number;
		eventType: string;
		params: string;
		context: EventContext|null;
		selector1: string;
		selector2: string;
		requiredItems: Record<string, boolean>|null;
		requiredSelectors: Record<string, boolean>|null;
		scripts: string;
	}
}
export {};

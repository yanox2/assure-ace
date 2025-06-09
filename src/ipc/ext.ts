/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Main
 *      イベントリスナ
 *---------------------------------------------------------------------------*/
/// <reference path="../types/global.d.mts" />

const DES: string = "//";

var vers = "1.0.0";
var port = "9910";
var browserNo = 0;
var tabNo = 0;
var ws = new WebSocket("ws://localhost:"+port);

var dbgLevel: number = 1;
function LOG(msg: string){
	if(dbgLevel == 0) return;
	console.log("LOG: ", msg);
}

document.body.addEventListener("click", listener);
document.body.addEventListener("change", listener);

function listener(e: Event){
	const tupleVals: string[]|null = Selector.getEventValue(e);
	if(tupleVals === null) return;
	const [evType, evVal] = tupleVals;

	const ins: Selector = new Selector(e);
	const ec: EventContext|null = ins.getCurrentEvent();
	if(!ec) return;
	const eItems: Map<string, boolean>|null = ins.requiredItems(ec);
	if(!eItems) return;

	try{
		ins.setContext(ec);
		const s1: string = ins.generate();
		const s2: string = ins.generatePrecisely();
		if(!s1) return;
		const op: Operation = {
			version: vers, id:0, browserNo:browserNo, tabNo:tabNo,
			eventType:evType, params:evVal, context:ec,
			requiredItems:eItems, selector1:s1, selector2:s2, scripts:""
		};
		LOG(JSON.stringify(op));
		ws.send(JSON.stringify(op));
	}catch(err){
		console.error("ERR: ", (err as Error).message);
	}
}

/* test
document.body.addEventListener("click", async function(e){
	const op: Operation = Selector.testOperation(browserNo, tabNo);
	ws.send(JSON.stringify(op));
	window.AABridge.testSend(browserNo, st).then((msg) => {
		LOG(msg);
	});
});
*/

class Selector{
	private event_: Event;
	private element_: Element;
	private context_?: EventContext;

	constructor(event: Event){
		this.event_ = event;
		this.element_ = event.target as Element;
	}

	// return event value for 2-tuple [eventType, eventValue]
	// ["click", ""], ["change", "select value"], ["fill", "input value"], ["fill", "fileNames"]
	public static getEventValue(event: Event): string[]|null{
		// click event
		if(event.type === "click") return ["click", ""];

		// change event
		const changedTags: string[] = [
			"textarea", "select", "input"
		];
		const inputTypes: string[] = [
			"text", "password", "email", "number", "tel", "url", "search",
			"date", "time", "datetime-local", "month", "week", "color", "file", "range"
			//"checkbox", "radio", "submit", "reset", "button", "image"
		];
		const ele: Element = event.target as Element;
		const tagName: string = ele.tagName.toLowerCase();
		if(!changedTags.includes(tagName)) return null;
		if(tagName === "textarea") return ["fill", (ele as HTMLTextAreaElement).value];
		if(tagName === "select") return ["change", (ele as HTMLSelectElement).value];

		// change event - input element
		const inpEle: HTMLInputElement = ele as HTMLInputElement;
		if(!inputTypes.includes(inpEle.type)) return null;
		let val: string = inpEle.value;
		if((inpEle.type === "number")||(inpEle.type === "range")){
			val = inpEle.valueAsNumber.toString();
		}else if((inpEle.type === "file")&&(inpEle.files?.length)){
			val = "";
			let sp: string = "";
			for(let i=0; i<inpEle.files.length; i++){
				val += sp + (inpEle.files[i] as any).path;
				sp=",";
			}
		}
		return ["fill", val];
	}

	public getCurrentEvent(): EventContext|null{
		let context: EventContext|null = this._parseTarget(this.element_);
		if(!context) return null;

		if(this.event_ instanceof MouseEvent){
			const rect: DOMRect = this.element_.getBoundingClientRect();
			context.offsetX = this.event_.clientX - rect.left;
			context.offsetY = this.event_.clientY - rect.top;
		}
		return context;
	}

	public requiredItems(context: EventContext): Map<string, boolean>|null{
		let eItems = new Map<string, boolean>();
		let required: boolean = true;
		if(context.id){
			eItems.set("id", true);
			required = false;
		}
		if(context.text){
			eItems.set("text", true);
			required = false;
		}
		if(context.name) eItems.set("name", required);
		if(context.inputType) eItems.set("type", required);
		if(context.value) eItems.set("value", required);
		if(context.label) eItems.set("label", required);
		if(context.dataId) eItems.set("dataId", required);
		return eItems;
	}

	public setContext(context: EventContext){
		this.context_ = context;
	}

/*---------------------------------------------------------------------------*
 * Text Selector
 *---------------------------------------------------------------------------*/
	public generate(): string{
		if(!this.context_) return "";
		const crrtEle: Element = this.element_;
		const crrtCon: EventContext = this.context_;
		let paths: Element[] = [crrtEle];

		// id/textがある場合
		let crrtSel: string = this._getXPath(crrtCon);
		if((crrtCon.id)||(crrtCon.text)) return DES+crrtSel;

		// 何らかの属性があり一意である場合
		const hasAttr = crrtSel.includes("[");
		if(hasAttr){
			if(this._isUnique(DES+crrtSel, crrtEle)) return DES+crrtSel;
		}

		// xpathに変換
		const conv = ((ele: Element): string => {
			const context: EventContext|null = this._parseTarget(ele);
			if(!context) throw new Error("Selector has no context. element=" + ele.tagName);
			return this._getXPath(context);
		});
		let xpaths: string[] = paths.map((ele, i) => { return conv(ele); });

		// フォーム部品か
		const hasTag = (ele: Element): boolean => ele.tagName.toLowerCase() === "form";
		const formEle: Element|null = this._getParent(crrtEle, hasTag);
		if(formEle){
			paths.unshift(formEle);
			xpaths.unshift(conv(formEle));
			crrtSel = this._assembly(xpaths);
			if(this._isUnique(crrtSel, crrtEle)) return crrtSel;
		}

		// idを持つ親要素があるか
		const hasId = (ele: Element): boolean => !!ele.id;
		const idEle: Element|null = this._getParent(crrtEle, hasId);
		if(idEle){
			paths.unshift(idEle);
			xpaths.unshift(conv(idEle));
			crrtSel = this._assembly(xpaths);
			if(this._isUnique(crrtSel, crrtEle)) return crrtSel;
		}

		crrtSel = this._finalize(paths, xpaths);
		return crrtSel;
	}

/*---------------------------------------------------------------------------*
 * CSS Selector
 *---------------------------------------------------------------------------*/
	public generatePrecisely(): string{
		let crrtEle: Element = this.element_;
		let tagName: string = crrtEle.tagName.toLowerCase();
		let path: string[] = [];
		while(true){
			let selector = crrtEle.tagName.toLowerCase();
			if(crrtEle.id){
				selector += "#" + crrtEle.id;
				path.unshift(selector);
				break;
			}
			if(crrtEle.className.trim()){
				let classes: string[] = crrtEle.className.split(/\s+/);
				selector += "." + classes.join("."); // .cls1.cls2.cls3
			}

			const nth: number = ((crrtEle, selector): number => {
				let [tagName, ...classParts] = selector.split(".");
				const className = classParts.join(".");
				tagName = tagName.toLowerCase();
		
				let nth = 1;
				let ele: Element = crrtEle;
				while(ele.previousElementSibling){
					ele = ele.previousElementSibling;
					if(ele.tagName.toLowerCase() === tagName){
						if(!className || classParts.every(cls => ele.classList.contains(cls))){
							nth++;
						}
					}
				}
				return nth;
			})(crrtEle, selector);
			if(nth != 1) selector += `:nth-of-type(${nth})`; // nth-child
			path.unshift(selector);

			const parent: Node|null = crrtEle.parentNode;
			if((parent)&&(parent.nodeType == Node.ELEMENT_NODE)){
				crrtEle = parent as Element;
				tagName = crrtEle.tagName.toLowerCase();
				if((tagName == "body")||(tagName == "html")) break;
			}
		}

		if(path.length == 0) return "";
		const selStr = path.join(" > ");
		return selStr;
	}

/*---------------------------------------------------------------------------*
 * private methods
 *---------------------------------------------------------------------------*/
	private _parseTarget(target: Element): EventContext|null{
		const ignoredTagsForText: string[] = ["form", "xxx"]; // text()を無視するタグ
		let context: EventContext = {
			tagName:"", inputType:"", id:"", text:"", name:"", value:"", label:"", dataId:"",
			offsetX:0, offsetY:0
		};
		let ele: any = undefined;
		if(target instanceof HTMLInputElement){
			ele = target as HTMLInputElement;
			if(ele.type) context.inputType = ele.type;
		}else if(target instanceof HTMLSelectElement){
			ele = target as HTMLSelectElement;
		}else if(target instanceof HTMLTextAreaElement){
			ele = target as HTMLTextAreaElement;
		}else if(target instanceof HTMLButtonElement){
			ele = target as HTMLButtonElement;
		}else if(target instanceof HTMLImageElement){
			ele = target as HTMLImageElement;
		}else if(target instanceof HTMLElement){
			ele = target as HTMLElement;
		}else if(target instanceof SVGElement){
			ele = target as SVGElement;
		}else if(target instanceof MathMLElement){
			ele = target as SVGElement;
		}else{
			return null;
		}

		// tagName & id & text
		context.tagName = ele.tagName.toLowerCase();
		if(ele.id) context.id = ele.id;
		if(!ignoredTagsForText.includes(context.tagName)){
			if((target instanceof HTMLElement)&&(ele.innerText)){
				context.text = ((crrtEle: Element): string => {
					for(const child of crrtEle.childNodes){
						if(child.nodeType === Node.TEXT_NODE){
							const text = child.textContent?.trim();
							if(text) return text;
						 }
					}
					return "";
				})(ele);
			}
		}

		// name
		if(ele.name){
			context.name = ele.name;
		}else{
			const attr = ele.getAttribute("name");
			if(attr) context.name = attr;
		}

		// value
		const isValid = (context: EventContext): boolean => {
			const sysControlled: string[] = ["checkbox", "radio", "button", "submit", "image", "reset"];
			return (sysControlled.includes(context.inputType)
				||(context.tagName === "option")||(context.tagName === "button"));
		};
		if((context.value)&&(isValid(context))){
			context.value = ele.value;
		}

		// customdata & screen reader
		const attr = ele.getAttribute("aria-label");
		if(attr) context.label = attr;
		if(ele.dataset.id) context.dataId = ele.dataset.id;

		return context;
	}

	private _getXPath(context: EventContext): string{
		const eItems: Map<string, boolean>|null = this.requiredItems(context);
		if(!eItems) return "";

		const attributeMap: Record<string, string> = {
			id: `@id="${context.id}"`,
			text: `text()="${context.text}"`,
			name: `name="${context.name}"`,
			type: `@type="${context.inputType}"`,
			value: `@value="${context.value}"`,
			label: `@aria-label="${context.label}"`,
			dataId: `@data-id="${context.dataId}"`
		};

		let selector = `${context.tagName}`;
		for(const [key, value] of eItems){
			if((value)&&(key in attributeMap)){
				selector += `[${attributeMap[key]}]`;
			}
		}
		return selector;
	}

	private _isUnique(xpath: string, ele?: Element): boolean{
		const result: XPathResult = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		LOG("uq:"+xpath+" "+result.snapshotLength);
		if(result.snapshotLength != 1) return false;
		if(ele){
			const target = result.snapshotItem(0);
			if(target === ele) return true;
		}
		return false;
	}

	private _getParent(ele: Element, condition: (element: Element) => boolean): Element|null{
		let crrtEle: Element = ele;
		let crrtTag: string = ele.tagName.toLowerCase();
		while(true){
			const parent: Node|null = crrtEle.parentNode;
			if((!parent)||(parent.nodeType != Node.ELEMENT_NODE)) break;
			crrtEle = parent as Element;
			if(condition(crrtEle)) return crrtEle;
			const crrtTag = crrtEle.tagName.toLowerCase();
			if((crrtTag == "body")||(crrtTag == "html")) break;
		}
		return null;
	}

	private _assembly(xpaths: string[]): string{
		let prefix: string = DES;
		if(xpaths.length == 0){
			return "";
		}else if(xpaths.length == 1){
			xpaths.unshift("body");
			prefix = "/html/";
		}
		return prefix + xpaths.join("//");
	}

	private _finalize(paths: Element[], xpaths: string[]): string{
		let selector: string = "";
		if(paths.length == 1){
			paths.unshift(document.body);
			xpaths.unshift("body");
		}

		const findNth = (sel: string, start: Element, target: Element): number => {
			const result: XPathResult = document.evaluate(sel, start, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			for(let i=0; i<result.snapshotLength; i++){
				if(result.snapshotItem(i) === target) return i+1;
			}
			return -1;
		};

		for(let i=xpaths.length-1; i>0; i--){
			const num: number = findNth(".//"+xpaths[i], paths[i-1], paths[i]);
			LOG(`chk:${xpaths[i]} ${xpaths[i-1]} ${paths[i-1]} ${num}`);
			if(num == -1) throw new Error(`Selector no match. selector=${selector} ${xpaths[i]}`);
			xpaths[i] += `[${num}]`;
			selector = this._assembly(xpaths);
			if(this._isUnique(selector)) return selector;
		}
		return selector;
	}

	private _countMatches(selector: string): number{
		const elements = document.querySelectorAll(selector);
		return elements.length;
	}

	private _countMatchesXPath(xpath: string, start?: Element): number{
		let result: XPathResult;
		if(start){
			result = document.evaluate(xpath, start, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		}else{
			result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		}
		return result.snapshotLength;
	}

/*---------------------------------------------------------------------------*
 * test
 *---------------------------------------------------------------------------*/
	public static testOperation(browserNo: number, tabNo: number): Operation{
		const op: Operation = {
			version: vers,
			id: 0,
			browserNo: browserNo,
			tabNo: tabNo,
			eventType: "change",
			params: "",
			context: {
				tagName:"textarea", id:"id_Area1", text:"入力項目", name:"name_Area1", value:"テスト",
				label:"", dataId:"", inputType:"", offsetX:10, offsetY:20
			},
			requiredItems: new Map<string, boolean>([["id", true]]),
			selector1: '::-p-xpath(//*[@id=\\"id_textArea1\\"])',
			selector2: '#id_textArea1',
			scripts: ""
		};
		return op;
	}
}

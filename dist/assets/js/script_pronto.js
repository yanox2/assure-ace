/*---------------------------------------------------------------------------*
 * JavaScript Pronto v3.1
 *
 * Copyright 2023 Pronto
 * Released under the MIT license
 *---------------------------------------------------------------------------*/

// 初期処理
function pr_init(){
	PRDebug.setLevel(0);
	PRCoord.reScroll();
	$(".prFade").on("click", function(e){
		return false;
	});
}

/*---------------------------------------------------------------------------*
 * デバッガ
 *---------------------------------------------------------------------------*/
class PRDebug{
	static level = 0; // 0:No display 1:display 2:console

	static setLevel(level){
		this.level = level;
	}

	static alert(msg, level=this.level){
		if(level == 1){
			alert(msg.replace(/[\n\r]/g,"\r\n"));
		}else if(level == 2){
			console.log(msg.replace(/[\n\r]/g,"\r\n"));
		}
	}
}

/*---------------------------------------------------------------------------*
 * 座標
 *---------------------------------------------------------------------------*/
class PRCoord{
	// 画面の中心を取得
	static getCenter(ele){
		var szw = ele.width();
		var szh = ele.height();
		var scx = document.body.scrollLeft || document.documentElement.scrollLeft;   
		var scy = document.body.scrollTop || document.documentElement.scrollTop;   
		var cw1 = document.documentElement.clientWidth || document.body.clientWidth || document.body.scrollWidth;
		var ch1 = document.documentElement.clientHeight || document.body.clientHeight || document.body.scrollHeight;
		var pos = new Array();
		pos[0] = Math.round((cw1/2) - (szw/2) + scx);
		pos[1] = Math.round((ch1/2) - (szh/2) + scy);
		if(pos[0] < scx+10) pos[0] = scx + 10;
		if(pos[1] < scy+10) pos[1] = scy + 10;
		return pos;
	}

	// マウス座標を取得
	static getMouseCoord(evt){
		if(!evt) return;
		var scx = document.body.scrollLeft || document.documentElement.scrollLeft;   
		var scy = document.body.scrollTop || document.documentElement.scrollTop;   
		var x = 0;
		var y = 0;
		if((!evt.pageX)||(!evt.pageY)){
			x = evt.clientX + scx;
			y = evt.clientY + scy;
		}else{
			x = evt.pageX;
			y = evt.pageY;
		}
		var pos = [x, y];
		//var pos = new Array(x, y);
		return pos;
	}

	static kpScroll(){
		var pos = "px=" + $(window).scrollLeft() + "&py=" + $(window).scrollTop();
		Cookies.set("re_loc", pos, {expires:1});
	}

	static reScroll(){
		var re = /px=(\d+)&py=(\d+)/;
		var ck = Cookies.get("re_loc");
		if(ck){
			var pos = ck.match(re);
			if(pos) window.scrollTo(pos[1], pos[2]);
			Cookies.remove("re_loc", {expires:1});
		}
	}
}

/*---------------------------------------------------------------------------*
 * ユーティリティ
 *---------------------------------------------------------------------------*/
class PRUtil{
	// getElementById & Name
	static getElementByIdName(id){
		var ele = $("#"+id);
		if(!ele.get(0)){
			ele = $("[name="+id+"]");
			if(!ele.get(0)) return null;
		}
		return ele;
	}
	
	// htmlspecialchars
	static htmlspecialchars(ch){
		ch = ch.replace(/&/g,"&amp;");
		ch = ch.replace(/"/g,"&quot;");
		ch = ch.replace(/'/g,"&#039;");
		ch = ch.replace(/</g,"&lt;");
		ch = ch.replace(/>/g,"&gt;");
		return ch;
	}

	static isJSON(str){
		try{
			JSON.parse(str);
			return true;
		}catch(e){
			return false;
		}
	}
}

/*---------------------------------------------------------------------------*
 * ローダー
 *---------------------------------------------------------------------------*/
class PRLoader{
	#maskId = "#prTag_maskAll";
	#id = "#prTag_loader";
	#state =  0; // 0:disabled,1:enabled
	#indZ = 2215; // indicator zIndex
	#maskZ = 2210; // masked zIndex

	constructor(){
		if($(this.#maskId) === null){
			PRDebug.alert(this.#maskId + "の要素がありません。");
		}
		if($(this.#id) === null){
			PRDebug.alert(this.#id + "の要素がありません。");
		}
	}

	// インジケータ表示
	enable(){
		if(this.#state == 1) return;
		this.mask();
		var ele = $(this.#id);
		var pos = PRCoord.getCenter(ele);
		ele.css({"display":"block", "left":pos[0]+"px", "top":pos[1]+"px", "zIndex":this.#indZ});
		this.#state = 1;
	}

	// インジケータ非表示
	disable(hasMask=false){
		var ele = $(this.#id);
		ele.css({"display":"none", "zIndex":"0"});
		this.#state = 0;
		if(!hasMask) this.unmask();
	}

	mask(){
		var w = document.documentElement.scrollWidth;
		var h = document.documentElement.scrollHeight;
		var ele = $(this.#maskId);
		ele.css({"width":w+"px", "height":h+"px", "zIndex":this.#maskZ, "opacity":"0.50", "filter":"alpha(opacity=50)"});
	}

	unmask(){
		var ele = $(this.#maskId);
		ele.css({"width":"0", "height":"0", "zIndex":"0", "opacity":"0.0", "filter":"alpha(opacity=0)"});
	}
}

/*---------------------------------------------------------------------------*
 * Ajax
 *---------------------------------------------------------------------------*/
class PRAjax{
	#url = null;
	#type = "post";
	#multiPart = false;
	#isJsonP = false;
	loader_ = null;
	#headers = null;
	#timeout = 30000; // 30s
	data_ = null;
	#fData = null;
	#params = null;
	#jsonpName = "jsonpcb";
	#state =  0; // 0:disabled,1:enabled
	#beforeCB = null;
	#afterCB = null;
	#failCB = null;

	before(args){
		if(this.#beforeCB) return this.#beforeCB(args);
	}
	after(data, textStatus, jqXHR, confirm){
		if(this.#afterCB) return this.#afterCB(data, textStatus, jqXHR, confirm);
	}
	fail(jqXHR, textStatus, errorThrown){
		if(this.#failCB) return this.#failCB(jqXHR, textStatus, errorThrown);
	}
	setBefore(callback){
		this.#beforeCB = callback;
	}
	setAfter(callback){
		this.#afterCB = callback;
	}
	setFail(callback){
		this.#failCB = callback;
	}

	constructor(url=null, type="post", isJsonP=false, multiPart=false){
		this.#url = url;
		this.#type = type;
		this.#isJsonP = isJsonP;
		this.#multiPart = multiPart;
		this.loader_ = new PRLoader();
	}

	// ヘッダー設定
	setHeaders(headers){
		this.#headers = headers;
	}

	// タイムアウト値 [ms]
	setTimeout(timeout){
		this.#timeout = timeout;
	}

	// フォームによる送信
	onSubmit(formId, argsBefore=null){
		$(formId).on("submit", {me:this}, function(e){
			e.preventDefault();
			var me = e.data.me;
			var form = $(formId);
			me.#url = form.attr("action");
			me.#type = form.attr("method");
			var attr = form.attr("enctype");
			if((attr)&&(attr.indexOf("multipart") !== -1)){
				me.#fData = new FormData(form[0]);
				me.#multiPart = true;
			}else{
				me.data_ = form.serialize();
			}
			me.send(0, argsBefore);
			return false; // e.preventDefault() & e.stopPropagation()
		});
	}

	// クリックによる送信
	onClick(id, jsonObj, hover=false, argsBefore=null){
		$(id).on("click", {me:this}, function(e){
			e.preventDefault();
			var me = e.data.me;
			me.setData(jsonObj);
			me.send(0, argsBefore);
			return false; // e.preventDefault() & e.stopPropagation()
		});
		if(!hover) return;
		$(id).on({
			mouseenter: function(){$(this).css("cursor","pointer");},
			mouseleave: function(){$(this).css("cursor","default");}
		});
	}

	// データを設定しsend()を実行して送信
	setData(jsonObj){
		if(!this.#multiPart){
			this.data_ = jsonObj;
			return;
		}
		var fData = new FormData();
		$.each(jsonObj, function(key, val){
			fData.set(key, val);
		});
		this.#fData = fData;
	}

	// データを追加しsend()を実行して送信
	addData(jsonObj){
		if(!this.#multiPart){
			this.data_ = {...this.data_, ...jsonObj};
			return;
		}
		if(!this.#fData){
			this.#fData = new FormData();
		}
		$.each(jsonObj, (key, val) => {
			this.#fData.append(key, val);
		});
	}

	// Ajax送信
	send(timeout=0, argsBefore=null){
		var rc = this.before(argsBefore);
		if(rc === false) return false;
		this.#setParams();
		if(timeout > 0) this.#params = Object.assign(this.#params, {"timeout":timeout});
		this.loader_.enable();
		$.ajax(this.#params).done(function(data, textStatus, jqXHR){
			this.loader_.disable(true);
			var confirm = true;
			if(data){
				if(data.message) PRDebug.alert(data.message, 1);
				if(data.confirm){
					confirm = window.confirm(data.confirm);
				}
				if(data.location){
					this.loader_.disable();
					location.href = data.location;
					return;
				}
				if(data.reload){
					PRCoord.kpScroll();
					location.reload(true);
					return;
				}
				if(data.dom) this._domUpdate(data.dom);
			}
			this.after(data, textStatus, jqXHR, confirm);
			var dbg = $("#id_debugResults");
			if((dbg.length>0)&&(data.debugResults)){
				dbg.append("<br>" + data.debugResults);
				dbg[0].scrollTo(0, dbg[0].scrollHeight);
			}
			this.loader_.disable();

		}).fail(function(jqXHR, textStatus, errorThrown){
			var msg = "システムとの通信中にエラーが発生しました。";
			msg += " (" + jqXHR.status + " " + textStatus + " " + errorThrown.message + ")";
			PRDebug.alert(msg, 1);
			this.fail(jqXHR, textStatus, errorThrown);
			this.loader_.disable();

		}).always(function(data, textStatus, jqXHR){
		});
		return rc;
	}

	#setParams(){
		this.#params = {
			url: this.#url,
			type: this.#type,
			async: true,
			cache: false,
			timeout: this.#timeout,
			context: this,
			dataType: "json"
		};
		if(this.#isJsonP){
			this.#params.dataType = "jsonp";
			this.#params.jsonp = this.#jsonpName;
		}
		if(this.#multiPart){
			this.#params = Object.assign(this.#params, {
				"data": this.#fData,
				"contentType": false,
				"processData": false
			});
		}else{
			this.#params.data = this.data_;
		}
		if(this.#headers) this.#params.headers = this.#headers;
	}

	// res:{dom:{append:{},prepend:{},after:{},before:{},replace:{},remove:{}}};
	_domUpdate(dom){
		if(dom.append){ // idの中にlastIn
			$.each(dom.append, function(id, tag){
				var ele = PRUtil.getElementByIdName(id);
				if(ele){
					ele.append(tag);
					ele.children().slideDown();
				}
			});
		}
		if(dom.prepend){ // idの中にfirstIn
			$.each(dom.prepend, function(id, tag){
				var ele = PRUtil.getElementByIdName(id);
				if(ele){
					ele.prepend(tag);
					ele.children().slideDown();
				}
			});
		}
		if(dom.after){ // idの直下に追加
			$.each(dom.after, function(id, tag){
				var ele = PRUtil.getElementByIdName(id);
				if(ele) ele.after(tag);
			});
		}
		if(dom.before){ // idの直前に追加
			$.each(dom.before, function(id, tag){
				var ele = PRUtil.getElementByIdName(id);
				if(ele) ele.before(tag);
			});
		}
		if(dom.replace){ // idの中を更新
			//$.each(dom.replace,function(id,tag){ $("#"+id).replaceWith(tag); });
			$.each(dom.replace, function(id, tag){
				var eles = PRUtil.getElementByIdName(id);
				if(!eles) return true; // continue
				$.each(eles, function(){
					var tagName = $(this).get(0).tagName;
					if(tagName == "INPUT"){
						if(($(this).attr("type") == "radio")||($(this).attr("type") == "checkbox")){
							var val = $(this).val();
							if(val == tag){
								$(this).prop("checked", true);
							}else{
								$(this).prop("checked", false);
							}
						}else{
							$(this).val(tag);
						}
					}else if((tagName == "SELECT")||(tagName == "TEXTAREA")){
						$(this).val(tag);
					}else if(tagName == "IMG"){
						$(this).attr("src", tag);
					}else{
						$(this).html(tag);
					}
				});
			});
		}
		if(dom.remove){ // idを無効化
			$.each(dom.remove, function(id, tag){
				var ele = PRUtil.getElementByIdName(id);
				if(ele) ele.addClass("prFade");
			});
		}
		if(dom.removef){ // idを削除
			$.each(dom.removef, function(id, tag){
				var ele = PRUtil.getElementByIdName(id);
				if(ele) ele.remove();
			});
		}
	}
}

class PRAjaxIPC extends PRAjax{
	// IPC通信
	send(timeout=0, argsBefore=null){
		var rc = this.before(argsBefore);
		if(rc === false) return false;
		this.loader_.enable();

		window.AABridge[argsBefore](this.data_).then(async (data) => {
			console.log(data);
			this.loader_.disable(true);
			var confirm = true;
			if(data){
				if(data.message){
					// alertでfocusが戻らないElectronの不具合（入力できなくなる）
					//PRDebug.alert(data.message, 1);
					await window.AABridge.alert(0, data.message);
				}
				if(data.confirm){
					confirm = window.confirm(data.confirm);
				}
				if(data.location){
					location.href = data.location;
					return;
				}
				if(data.reload){
					PRCoord.kpScroll();
					location.reload(true);
					return;
				}
				if(data.dom) this._domUpdate(data.dom);
			}
			this.after(data);
			var dbg = $("#id_debugResults");
			if((dbg.length>0)&&(data.debugResults)){
				dbg.append("<br>" + data.debugResults);
				dbg[0].scrollTo(0, dbg[0].scrollHeight);
			}
			this.loader_.disable();

		}).catch((err) => {
			var msg = "システムとの通信中にエラーが発生しました。";
			//msg += " (" + jqXHR.status + " " + textStatus + " " + errorThrown.message + ")";
			PRDebug.alert(msg, 1);
			//this.fail(jqXHR, textStatus, errorThrown);
			this.loader_.disable();
		});
		return rc;
	}
}



/*---------------------------------------------------------------------------*
 *
 * vendors
 *
 *---------------------------------------------------------------------------*/
/*!
 * JavaScript Cookie v2.2.0
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader = false;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function init (converter) {
		function api (key, value, attributes) {
			var result;
			if (typeof document === 'undefined') {
				return;
			}

			// Write

			if (arguments.length > 1) {
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);

				if (typeof attributes.expires === 'number') {
					var expires = new Date();
					expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
					attributes.expires = expires;
				}

				// We're using "expires" because "max-age" is not supported by IE
				attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

				try {
					result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}

				if (!converter.write) {
					value = encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
				} else {
					value = converter.write(value, key);
				}

				key = encodeURIComponent(String(key));
				key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
				key = key.replace(/[\(\)]/g, escape);

				var stringifiedAttributes = '';

				for (var attributeName in attributes) {
					if (!attributes[attributeName]) {
						continue;
					}
					stringifiedAttributes += '; ' + attributeName;
					if (attributes[attributeName] === true) {
						continue;
					}
					stringifiedAttributes += '=' + attributes[attributeName];
				}
				return (document.cookie = key + '=' + value + stringifiedAttributes);
			}

			// Read

			if (!key) {
				result = {};
			}

			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling "get()"
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var rdecode = /(%[0-9A-Z]{2})+/g;
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!this.json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = parts[0].replace(rdecode, decodeURIComponent);
					cookie = converter.read ?
						converter.read(cookie, name) : converter(cookie, name) ||
						cookie.replace(rdecode, decodeURIComponent);

					if (this.json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					if (key === name) {
						result = cookie;
						break;
					}

					if (!key) {
						result[name] = cookie;
					}
				} catch (e) {}
			}

			return result;
		}

		api.set = api;
		api.get = function (key) {
			return api.call(api, key);
		};
		api.getJSON = function () {
			return api.apply({
				json: true
			}, [].slice.call(arguments));
		};
		api.defaults = {};

		api.remove = function (key, attributes) {
			api(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));
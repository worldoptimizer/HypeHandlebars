/*!
Hype Handlebars 1.6
copyright (c) 2020 Max Ziebell, (https://maxziebell.de). MIT-license
*/

/**
* A module that extends Tumult Hype with the possibility to use Handlebars in your Hype documents
* @module Hype Handlebars
*/

/*
* Version-History
* 1.0	Initial release under MIT
* 1.1	Refactored code
* 1.2	Added hypeDocument resolver and local helper
* 1.3	Added more capabilities to the hypeDocument resolver
* 1.4	Refactored Handlebars as instances and added local variables
* 1.5	Set default selector per instance and update per selector
* 1.6	Set default data source or route data source by function
*/

if("HypeHandlebars" in window === false) window['HypeHandlebars'] = (function () {

	var _templates = {};
	var _hbs = {};
	var _settings = {};
	
	/* hype document functions*/
	function extendHype(hypeDocument, element, event) {
		
		_hbs[hypeDocument.documentId()] = Handlebars.create();

		_settings[hypeDocument.documentId()] = {
			selector: '[data-handlebars]',
			dataSource: null,
			updateOnSceneLoad: false,
		}

		hypeDocument.getHandlebars = function(){
			return _hbs[hypeDocument.documentId()];
		}
		
		/* helper */
		function helper_querySelector(selector){
			return document.querySelector(selector);
		}

		function helper_querySelectorScene(selector){
			return document.getElementById(hypeDocument.currentSceneId()).querySelector(selector);
		}

		function helper_hypeDocumentResolver() {
			var options = arguments[arguments.length-1];
			var args = Array.prototype.slice.call(arguments, 0,arguments.length-1)
			var cmd = options.name.split('.');
			var scope = hypeDocument;
			if (cmd.length==2 && options.data[cmd[0]] instanceof Object) {
				scope = options.data[cmd.shift()]; cmd = cmd.join('.');
			} else {
				cmd = options.name;
			}
			if (typeof scope[cmd] == 'function'){
				var result = scope[cmd].apply(scope, args);
				if (result) return new _hbs[hypeDocument.documentId()].SafeString(result);
			}
		}

		/**
		 * Update all handlebars in the scene
		 *
 		 *     hypeDocument.updateHandlebars();
		 *
		 * @param {Object} options is optional and allows for the usual Handlebar settings, defaults to useful settings for Hype if not set
		 * @param {Nodelist} elms is an optional nodelist to limit the update to a specific set of HTML elements
		 */
		hypeDocument.updateHandlebars = function(options, elms){
			var sceneElm = document.getElementById(hypeDocument.currentSceneId());
			var hbsElms = elms || sceneElm.querySelectorAll(_settings[hypeDocument.documentId()].selector);
			hbsElms.forEach(function(elm){
				hypeDocument.updateHandlebarsByElement(elm, options);
			});
		}

		/**
		 * Convenience wrapper to hypeDocument.updateHandlebars method putting the nodelist argument first to avoid passing a null
		 *
		 *     var elms = document.querySelector('.myHandleBars');
 		 *     hypeDocument.updateHandlebarsByNodelist(elms);
		 *
		 * @param {Nodelist} elms is an optional nodelist to limit the update to a specific set of HTML elements
		 * @param {Object} options is optional and allows for the usual Handlebar settings, defaults to useful settings for Hype if not set
		 */
		hypeDocument.updateHandlebarsByNodelist = function(elms, options){
			hypeDocument.updateHandlebars(options, elms);
		}

		/**
		 * This function is the what is actually being called to make the Handlebar updates and set the option defaults. These include addition helper functions and variable shortcuts. The Handlebars in Hype know about the context they are running in giving you access to hypeDocument and if available symbolInstance. This allow for function calls to the API of the hypeDocument or symbolInstance.
		 *
		 *     var elm = hypeDocument.getElementById('myElement');
 		 *     hypeDocument.updateHandlebarsByElement(elm, {
		 *     	disableHypeResolver: true,
		 *     	disableQueryHelper: true,
		 *     	disableHypeVariables: true,
		 *     });
		 *
		 * - `disableHypeResolver: true` removes the possibility to call Hype function from within Hype Handlebar, `false` is default
		 * - `disableQueryHelper: true` disables the Handlebar helper for scene queries like `{{$ '.myElement'}}` and document queries like `{{querySelector '.test'}}`, `false` is default
		 * - `disableHypeVariables: true` disables Handlebar helper allowing shortcuts to current symbolInstance, symbolElement, hypeDocument, element and elementId, false is default
		 * 
		 * Even more default Handlebar options can be found on the Handlebars documentation. Only listing Hype specific additions here.
		 *
		 * @param {Nodelist} elms is an optional nodelist to limit the update to a specific set of HTML elements
		 * @param {Object} options is optional and allows for the usual Handlebar settings, defaults to useful settings for Hype if not set
		 */
		hypeDocument.updateHandlebarsByElement = function(elm, options){
			if(_templates[elm.id] == null) {
				var settings = _settings[hypeDocument.documentId()];
				_templates[elm.id] = {
					id: elm.id,
					compiled: _hbs[hypeDocument.documentId()].compile(elm.innerHTML),
					update: function(options){
						if (!options) options = {}
						if (!options.helpers) options.helpers = {}
						if (!settings.disableHypeResolver) {
							if (!options.helpers['helperMissing']) options.helpers['helperMissing'] = helper_hypeDocumentResolver;
						}
						if (!settings.disableQueryHelper) {
							if (!options.helpers["querySelector"]) options.helpers["querySelector"] = helper_querySelector;
							if (!options.helpers["$"]) options.helpers["$"] = helper_querySelectorScene;
						}
						if (!options.data) options.data = {}
						if (!settings.disableHypeVariables) {
							if (!this.hasOwnProperty('symbolInstance')) {
								this.symbolInstance = hypeDocument.getSymbolInstanceForElement(elm);
							}
							if (this.symbolInstance) {
								options.data['symbolInstance'] = this.symbolInstance;
								options.data['symbolElement'] = this.symbolInstance.element();
							}
							options.data['hypeDocument'] = hypeDocument;
							options.data['element'] = document.getElementById(this.id);
							options.data['elementId'] = '#'+this.id;
						}
						try{
							var dataSource = options.dataSource || settings.dataSource || hypeDocument.customData;
							if (typeof dataSource === "function") dataSource = dataSource(elm, options);
							elm.innerHTML = this.compiled(dataSource, options);
						} catch(e) {
							console.log(e);
						}
					}
				}
			}
			_templates[elm.id].update(options);
		}

		hypeDocument.setHandlebarsTemplateById = function(id, tmpl,options){
			if (_templates[id]) delete _templates[id];
			var elm = document.getElementById(id);
			if (elm){
				elm.innerHTML = tmpl;
				hypeDocument.updateHandlebarsByElement(elm, options);
			}
		}

		hypeDocument.setHandlebarsDefaultByKey = function(key, val){
			if (key) _settings[hypeDocument.documentId()][key] = val;
		}	

		//Hype Symbol Cache compatiblitity
		if (!hypeDocument.getSymbolInstanceForElement) { 
			hypeDocument.getSymbolInstanceForElement = function(element){
				var symbolInstance = null;
				var parentSymbolElement = element.parentNode;
				while (symbolInstance == null && parentSymbolElement != null) {
					symbolInstance = this.getSymbolInstanceById(parentSymbolElement.id);
					parentSymbolElement = parentSymbolElement.parentNode;
				} 
				return symbolInstance;
			}
		}
	}

	function sceneLoad(hypeDocument, element, event) {
		var update = _settings[hypeDocument.documentId()].updateOnSceneLoad;
		if (update) {
			if (typeof update === "function") {
				update();
			} else {
				hypeDocument.updateHandlebars();
			}
		}
	}
	
	/* Setup Hype listeners */
	if("HYPE_eventListeners" in window === false) { window.HYPE_eventListeners = Array();}
	window.HYPE_eventListeners.push({"type":"HypeDocumentLoad", "callback":extendHype});
	window.HYPE_eventListeners.push({"type":"HypeSceneLoad", "callback":sceneLoad});

	/* Reveal Public interface to window['HypeHandlebars'] */
	return {
		version: '1.6',
	};
})();	

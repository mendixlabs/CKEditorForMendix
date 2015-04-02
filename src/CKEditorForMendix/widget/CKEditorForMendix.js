/*jslint white:true, nomen: true, plusplus: true */
/*global mx, mxui, document, define, require, browser, devel, console, window */
/*mendix */

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
require({
	packages: [{
		name: 'jquery',
		location: '../../widgets/CKEditorForMendix/widget/lib',
		main: 'jquery'
	},{
		name: 'ckeditor',
		location: '../../widgets/CKEditorForMendix/widget/lib',
		main: 'ckeditor'
	}]
}, [
	'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
	'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text',
	'jquery', 'ckeditor', 'dojo/text!CKEditorForMendix/widget/templates/CKEditorForMendix.html'
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, $, _CKEditor, widgetTemplate) {
	'use strict';

	// Declare widget.
	return declare('CKEditorForMendix.widget.CKEditorForMendix', [_WidgetBase, _TemplatedMixin], {

		/**
		 * Internal variables.
		 * ======================
		 */
		_wgtNode: null,
		_contextGuid: null,
		_contextObj: null,
		_handles: null,
		_alertdiv : null,

		// Extra variables
		_extraContentDiv: null,
		_editor: null,

		// CKEditor instances.
		_settings: null,

		// Template path
		templateString: widgetTemplate,

		/**
		 * Mendix Widget methods.
		 * ======================
		 */

		// DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
		postCreate: function () {

			// postCreate
			console.debug('ckeditorformendix - postCreate');

			// Load CSS ... automaticly from ui directory

			// Setup widgets
			this._setupWidget();

			// Create childnodes
			if(!this.readOnly) {
				this._createChildNodes();
				this._setupEvents();
			}

		},

		// DOJO.WidgetBase -> Startup is fired after the properties of the widget are set.
		startup: function () {

			// postCreate
			console.log('ckeditorformendix - startup');

		},

		/**
		 * What to do when data is loaded?
		 */
		update: function (obj, callback) {

			// startup
			console.debug('ckeditorformendix - update');

			this._contextObj = obj;
			this._resetSubscriptions();
			this._updateRendering();
			
			callback();
			
		},

		enable: function () {
			//TODO, what will happen if the widget is suspended (not visible).
		},

		disable: function () {
			//TODO, what will happen if the widget is resumed (set visible).
		},

		uninitialize: function () {

		},

		/**
		 * Extra setup widget methods.
		 * ======================
		 */
		_setupWidget: function () {

			// To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
			this._wgtNode = this.domNode;
		},

		_setupEvents: function () {
			// Handle change event of content!
			this._editor.on('change', lang.hitch(this, function () {
				this._editorChange(this._editor.getData());
				
				if(this.onChangeMicroflow) {
					mx.data.action({
						params: {
							applyto: 'selection',
							actionname: this.onChangeMicroflow,
							guids: [this._contextObj.getGuid()]
						},
						callback: function (obj) {
							//TODO what to do when all is ok!
						},
						error: function (error) {
							console.log(this.id + ': An error occurred while executing microflow: ' + error.description);
						}
					}, this);
				}
			}));
		},
		
		_editorChange: function (data) {
			console.debug('ckeditorformendix - content has changed. - ' + data);
			if (this._contextObj !== null) {
				this._contextObj.set(this.messageString, data);
			}
		},

		// Create child nodes.
		_createChildNodes: function () {

			// Example setting message
			this.domNode.appendChild(mxui.dom.create('textarea', {
				'name': 'html_editor_' + this.id,
				'id': 'html_editor_' + this.id,
				'rows': '10',
				'cols': '80'
			}));

				var editor = null,
					seperator1 = null,
					seperator2 = null;

				console.debug('ckeditorformendix - BASEPATH - ' + window.CKEDITOR_BASEPATH);

				// Create new config!
				this._settings = [];
				this._settings[this.id] = {
					config: {
						toolbarGroups: []
					}
				};

				this._CKEditor = window.CKEDITOR;

				// Collapsable toolbar
				this._settings[this.id].config.toolbarCanCollapse = true;

				// Autogrow functionality of the editor.
				this._settings[this.id].config.autoGrow_minHeight = 300;
				this._settings[this.id].config.autoGrow_onStartup = true;
				if(this.width > 0) { 
					this._settings[this.id].config.width = this.width;
				}
				if(this.height > 0) { 
					this._settings[this.id].config.height = this.height;
				}
				

				// Base URL inside CKEditor
				this._settings[this.id].config.baseHref = mx.appUrl;

				// CSS class
				if (this.bodyCssClass !== '') {
					this._settings[this.id].config.bodyClass = this.bodyCssClass;
				}

				seperator1 = false;
				seperator2 = false;

				this._CKEditor.config.toolbarGroups = [];

				if (this.toolbarDocument) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'document',
						groups: ['mode', 'document', 'doctools']
					});
					seperator1 = true;
				}
				if (this.toolbarClipboard) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'clipboard',
						groups: ['clipboard', 'undo']
					});
					seperator1 = true;
				}
				if (this.toolbarEditing) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'editing',
						groups: ['find', 'selection', 'spellchecker']
					});
					seperator1 = true;
				}
				if (this.toolbarForms) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'forms'
					});
					seperator1 = true;
				}

				if (this.toolbarSeperator1) {
					this._settings[this.id].config.toolbarGroups.push('/');
				}

				if (this.toolbarBasicstyles) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'basicstyles',
						groups: ['basicstyles', 'cleanup']
					});
					seperator2 = true;
				}
				if (this.toolbarParagraph) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'paragraph',
						groups: ['list', 'indent', 'blocks', 'align', 'bidi']
					});
					seperator2 = true;
				}
				if (this.toolbarLinks) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'links'
					});
					seperator2 = true;
				}
				if (this.toolbarInsert) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'insert'
					});
					seperator2 = true;
				}

				if (this.toolbarSeperator2) {
					this._settings[this.id].config.toolbarGroups.push('/');
				}

				if (this.toolbarStyles) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'styles'
					});
				}
				if (this.toolbarColors) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'colors'
					});
				}
				if (this.toolbarTools) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'tools'
					});
				}
				if (this.toolbarOthers) {
					this._settings[this.id].config.toolbarGroups.push({
						name: 'others'
					});
				}

				// Create a CKEditor from HTML element.
				this._editor = this._CKEditor.replace('html_editor_' + this.id, this._settings[this.id].config);

				// Attach Mendix Widget to editor and pass to the CKEditor the mendix widget configuration.
				this._editor.mendixWidget = this;
				this._editor.mendixWidgetID = this.id;
				this._editor.mendixWidgetConfig = {
					microflowLinks: this.microflowLinks
				};

				// in case of data not loaded into editor, because editor was not ready
				lang.hitch(this, this._updateRendering());

				console.debug('ckeditorformendix - createChildNodes events');
				console.debug('ckeditorformendix - added');

		},

		_handleValidation: function(validations) {
			this._clearValidations();

			var val = validations[0],
				msg = val.getReasonByAttribute(this.messageString);    

			if(this.readOnly){
				val.removeAttribute(this.messageString);
			} else {                                
				if (msg) {
					this._addValidation(msg);
					val.removeAttribute(this.messageString);
				}
			}
		},

		_clearValidations: function() {
			domConstruct.destroy(this._alertdiv);
		},

		_addValidation : function(msg) {
			this._alertdiv = domConstruct.create("div", { 
				class : 'alert alert-danger',
				innerHTML: msg });

			this.domNode.appendChild(this._alertdiv);

		},
		
		/**
		 * Interaction widget methods.
		 * ======================
		 */
		_updateRendering: function () {

			if(this._contextObj) {			
				console.debug(this._contextObj.get(this.messageString));

				domStyle.set(this.domNode, "display", "initial");
				
				if (this._editor !== null) {
					this._editor.setData(this._contextObj.get(this.messageString));
				} else {
					console.info('ckeditorformendix - Unable to add contents to editor, no _editor object available');
				}
			}
			else {
				domStyle.set(this.domNode, "display", "none");
			}
		},
		_resetSubscriptions: function () {
			var objHandle = null, 
				attrHandle = null, 
				validationHandle = null;

			// Release handles on previous object, if any.
			if(this._handles){
				this._handles.forEach(function (handle, i) {
					mx.data.unsubscribe(handle);
				});
			}

			if (this._contextObj) {
				objHandle = this.subscribe({
					guid: this._contextObj.getGuid(),
					callback: lang.hitch(this,function(guid) {
						this._updateRendering();
					})
				});
				
//				attrHandle = this.subscribe({
//					guid: this._contextObj.getGuid(),
//					attr: this.messageString,
//					callback: lang.hitch(this,function(guid,attr,attrValue) {
//						this._updateRendering();
//					})
//				});

				validationHandle = mx.data.subscribe({
					guid     : this._contextObj.getGuid(),
					val      : true,
					callback : lang.hitch(this,this._handleValidation)
				});

				this._handles = [objHandle, attrHandle, validationHandle];
			}
		}
	});
});




/*jslint white:true, nomen: true, plusplus: true */
/*global mx, mxui, document, define, require, browser, devel, console, window, dojo */
/*mendix */

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
require({
	packages: [{
		name: 'jquery',
		location: '../../widgets/CKEditorForMendix/widget/lib',
		main: 'jquery'
	}, {
		name: 'ckeditor',
		location: '../../widgets/CKEditorForMendix/widget/lib',
		main: 'ckeditor_viewer'
	}]
}, [
	'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
	'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text',
	'jquery', 'ckeditor', 'dojo/text!CKEditorForMendix/widget/templates/CKEditorViewerForMendix.html'
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, $, _CKEditorViewer, widgetTemplate) {
	'use strict';

	// Declare widget.
	return declare('CKEditorForMendix.widget.CKEditorViewerForMendix', [_WidgetBase, _TemplatedMixin], {

		// Template path
		templateString: widgetTemplate,
		
		/**
		 * Internal variables.
		 * ======================
		 */
		_contextObj: null,
		_handles: null,


		/**
		 * Mendix Widget methods.
		 * ======================
		 */

		// DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
		postCreate: function () {

			// postCreate
			console.log('CKEditorViewerForMendixNode - postCreate');

		},

		/**
		 * What to do when data is loaded?
		 */
		update: function (obj, callback) {

			// startup
			console.log('CKEditorViewerForMendixNode - update');
			
			this._contextObj = obj;
			this._resetSubscriptions();
			this._updateRendering();

			// Execute callback.
			callback();
		},

		/**
		 * How the widget re-acts from actions invoked by the Mendix App.
		 */

		enable: function () {
			//TODO, what will happen if the widget is suspended (not visible).
		},

		disable: function () {
			//TODO, what will happen if the widget is resumed (set visible).
		},

		uninitialize: function () {
			//TODO, clean up only events
		},

		/**
		 * Interaction widget methods.
		 * ======================
		 */
		_updateRendering: function () {

			if(this._contextObj) {
				
				domStyle.set(this.domNode, "display", "initial");
				var html = this._contextObj.get(this.messageString),
					name = Date.now();

				// Set the content of the link.
				window.CKEditorViewer.data[this.id] = {};
				window.CKEditorViewer.data[this.id].microflowLinks = this.microflowLinks;

				// Replace the html with the constant variables.

				html = html.split('__LINK__').join('#' + name + '" name="' + name + '"');
				html = html.split('__ID__').join(window.CKEditorViewer.base64.encode(this.id));
				html = html.split('__GUID__').join(window.CKEditorViewer.base64.encode(this._contextObj.getGuid()));

				$(this.domNode).html('');
				$(this.domNode).append(html);
			}
			else {
				domStyle.set(this.domNode, "display", "none");
			}
		},

		_resetSubscriptions: function () {
			var objHandle = null, 
				attrHandle = null;

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

				attrHandle = this.subscribe({
					guid: this._contextObj.getGuid(),
					attr: this.messageString,
					callback: lang.hitch(this,function(guid,attr,attrValue) {
						this._updateRendering();
					})
				});

				this._handles = [objHandle, attrHandle];
			}
		}

	});
});

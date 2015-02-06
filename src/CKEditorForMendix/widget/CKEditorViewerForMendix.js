/*jslint white:true, nomen: true, plusplus: true */
/*global mx, mxui, document, define, require, browser, devel, console, window */
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

		/**
		 * Internal variables.
		 * ======================
		 */
		_contextGuid: null,
		_contextObj: null,
		_handle: null,

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
			console.log('CKEditorViewerForMendixNode - postCreate');

			// Load CSS ... automaticly from ui directory

			// Setup widgets
			this._setupWidget();

			// Create childnodes
			this._createChildNodes();

			// Setup events
			this._setupEvents();

			// Show message
			this._showMessage();

		},

		// DOJO.WidgetBase -> Startup is fired after the properties of the widget are set.
		startup: function () {

			// postCreate
			console.log('CKEditorViewerForMendixNode - startup');

		},

		applyContext: function (context, callback) {

			// Release handle on previous object, if any.
			if (this._handle) {
				mx.data.unsubscribe(this._handle);
			}

			// Subscribe to object updates.
			this._handle = mx.data.subscribe({
				guid: context.getTrackId(),
				callback: dojo.hitch(this, function (obj) {

					mx.data.get({
						guids: [obj],
						callback: dojo.hitch(this, function (objs) {

							// Set the object as background.
							this._contextObj = objs[0];

							// Load data again.
							this._loadData();

						})
					});

				})
			});

			mx.data.get({
				guids: [context.getTrackId()],
				callback: dojo.hitch(this, function (callback, objs) {

					// Set the object as background.
					this._contextObj = objs[0];

					// Load data again.
					this._loadData();

					// Execute callback.
					if (typeof callback !== 'undefined') {
						callback();
					}

				}, callback)
			});

		},

		/**
		 * What to do when data is loaded?
		 */
		update: function (obj, callback) {

			// startup
			console.log('CKEditorViewerForMendixNode - update');

			// Release handle on previous object, if any.
			if (this._handle) {
				mx.data.unsubscribe(this._handle);
			}

			if (obj === null) {

				// Sorry no data no show!
				console.log('CKEditorViewerForMendixNode - update - We did not get any context object!');

			} else {

				// Set object internally
				this._contextObj = obj;

				// Load data
				this._loadData();

				// Subscribe to object updates.
				this._handle = mx.data.subscribe({
					guid: this._contextObj.getGuid(),
					callback: dojo.hitch(this, function (obj) {

						mx.data.get({
							guids: [obj],
							callback: dojo.hitch(this, function (objs) {

								// Set the object as background.
								this._contextObj = objs;

								// Load data again.
								this._loadData();

							})
						});

					})
				});
			}

			// Execute callback.
			if (typeof callback !== 'undefined') {
				callback();
			}
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
			if (this._handle) {
				mx.data.unsubscribe(this._handle);
			}
		},


		/**
		 * Extra setup widget methods.
		 * ======================
		 */
		_setupWidget: function () {

			// Setup jQuery
			this.$ = _jQuery().jQuery();

			// Load the CKEditorViewer code to execute a microflow.
			_CKEditorViewer().viewer();

		},


		// Create child nodes.
		_createChildNodes: function () {

			// Assigning externally loaded library to internal variable inside function.
			var $ = this.$;

		},

		// Attach events to newly created nodes.
		_setupEvents: function () {

			console.log('CKEditorViewerForMendixNode - setup events');

		},


		/**
		 * Interaction widget methods.
		 * ======================
		 */
		_loadData: function () {

			var $ = this.$,
				html = this._contextObj.get(this.messageString),
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

		},

		_showMessage: function () {
			console.log(this.messageString);
		}

	});
});

}());
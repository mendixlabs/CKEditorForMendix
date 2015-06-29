/*jslint white:true, nomen: true, plusplus: true */
/*global mx, mxui, document, define, require, browser, devel, console, window, dojo */
/*mendix */

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
	'dojo/dom-style', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text',
	'jquery', 'ckeditor', 'dojo/text!CKEditorForMendix/widget/templates/CKEditorViewerForMendix.html'
], function (declare, _WidgetBase, _TemplatedMixin, domStyle, dojoArray, lang, text, $, _CKEditorViewer, widgetTemplate) {
	'use strict';

	return declare('CKEditorForMendix.widget.CKEditorViewerForMendix', [_WidgetBase, _TemplatedMixin], {

		// Template path
		templateString: widgetTemplate,
		
		_contextObj: null,
		_handles: null,

		update: function (obj, callback) {
			console.log('CKEditorViewerForMendixNode - update');
			
			this._contextObj = obj;
			this._resetSubscriptions();
			this._updateRendering();

			callback();
		},

		_updateRendering: function () {

			if(this._contextObj) {
				
				domStyle.set(this.domNode, "display", "inline");
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
				dojoArray.forEach(this._handles, function (handle) {
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

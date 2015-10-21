/*jslint white:true, nomen: true, plusplus: true */
/*global mx, mxui, document, define, require, browser, devel, console, window */
/*mendix */

define([
        'dojo/_base/declare',
        'mxui/widget/_WidgetBase',
        'dijit/_TemplatedMixin',
        'mxui/dom',
        'dojo/dom-style',
        'dojo/dom-construct',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/text',
        'CKEditorForMendix/widget/lib/jquery-1.11.1',
        'CKEditorForMendix/widget/lib/ckeditor',
        'dojo/text!CKEditorForMendix/widget/templates/CKEditorForMendix.html'
    ], function (declare, _WidgetBase, _TemplatedMixin, dom, domStyle, domConstruct, dojoArray, lang, text, _jQuery, _CKEditor, widgetTemplate) {
    'use strict';

    var $ = _jQuery.noConflict(true);
    
    return declare('CKEditorForMendix.widget.CKEditorForMendix', [_WidgetBase, _TemplatedMixin], {
        _contextGuid: null,
        _contextObj: null,
        _handles: null,
        _alertdiv: null,
        _hasStarted : false,

        // Extra variables
        _extraContentDiv: null,
        _editor: null,

        // CKEditor instances.
        _settings: null,

        templateString: widgetTemplate,

        startup: function () {
            if (this._hasStarted)
                return;
                
            this._hasStarted = true;
            
            console.debug('ckeditorformendix - startup');
            
            // Create childnodes
            if (!this.readOnly) {
                this._createChildNodes();
                this._setupEvents();
            }
        },

        update: function (obj, callback) {
            console.debug('ckeditorformendix - update');

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },


        _setupEvents: function () {
            
            console.log(this);
            
            //On keypress event
            this._editor.on('key', lang.hitch(this, function () {
                this._editorChange(this._editor.getData());

                if (this.onKeyPressMicroflow) {
                    mx.data.action({
                        params: {
                            applyto: 'selection',
                            actionname: this.onKeyPressMicroflow,
                            guids: [this._contextObj.getGuid()]
                        },
                        callback: function (obj) {
                        },
                        error: function (error) {
                            console.log(this.id + ': An error occurred while executing microflow: ' + error.description);
                        }
                    }, this);
                }
            }));

            //On change event
            this._editor.on('blur', lang.hitch(this, function (e) {
                if (this._editor.checkDirty() && this.onChangeMicroflow) {
                    mx.data.action({
                        params: {
                            applyto: 'selection',
                            actionname: this.onChangeMicroflow,
                            guids: [this._contextObj.getGuid()]
                        },
                        callback: lang.hitch(this, function (obj) {
                            this._editor.resetDirty();
                        }),
                        error: lang.hitch(this, function (error) {
                            console.log(this.id + ': An error occurred while executing microflow: ' + error.description);
                        })
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
            this.domNode.appendChild(dom.create('textarea', {
                'name': 'html_editor_' + this.id,
                'id': 'html_editor_' + this.id,
                'rows': '10',
                'cols': '80'
            }));

            var seperator1 = null,
                seperator2 = null;

            console.debug('ckeditorformendix - BASEPATH - ' + window.CKEDITOR_BASEPATH);

            // Create new config
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
            if (this.width > 0) {
                this._settings[this.id].config.width = this.width;
            }
            if (this.height > 0) {
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
            
            // Set enterMode
            this._editor.config.enterMode = this._CKEditor['ENTER_' + this.enterMode];

            // Attach Mendix Widget to editor and pass the mendix widget configuration to the CKEditor.
            this._editor.mendixWidget = this;
            this._editor.mendixWidgetID = this.id;
            this._editor.mendixWidgetConfig = {
                microflowLinks: this.microflowLinks
            };

            // in case of data not loaded into editor, because editor was not ready
            this._updateRendering();

            console.debug('ckeditorformendix - createChildNodes events');
        },

        _handleValidation: function (validations) {
            this._clearValidations();

            var val = validations[0],
                msg = val.getReasonByAttribute(this.messageString);

            if (this.readOnly) {
                val.removeAttribute(this.messageString);
            } else {
                if (msg) {
                    this._addValidation(msg);
                    val.removeAttribute(this.messageString);
                }
            }
        },

        _clearValidations: function () {
            domConstruct.destroy(this._alertdiv);
        },

        _addValidation: function (msg) {
            this._alertdiv = domConstruct.create("div", {
                'class': 'alert alert-danger',
                innerHTML: msg
            });

            this.domNode.appendChild(this._alertdiv);

        },
        
        _updateRendering: function () {
            if (this._contextObj) {
                console.debug(this._contextObj.get(this.messageString));

                domStyle.set(this.domNode, "visibility", "visible");

                if (this._editor !== null) {
                    this._editor.setData(this._contextObj.get(this.messageString));
                } else {
                    console.info('ckeditorformendix - Unable to add contents to editor, no _editor object available');
                }
            } else {
                domStyle.set(this.domNode, "visibility", "hidden");
            }
        },
        
        _resetSubscriptions: function () {
            var objHandle = null,
                validationHandle = null;

            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
            }

            if (this._contextObj) {
                objHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });

                validationHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });

                this._handles = [objHandle, validationHandle];
            }
        },
        
        uninitialize: function () {
            if (this._editor) {
                this._editor.removeAllListeners();
                this._CKEditor.remove(this._editor);
            }
        }
    });
});
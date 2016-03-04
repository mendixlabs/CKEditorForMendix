define([
        "dojo/_base/declare",
        "mxui/widget/_WidgetBase",
        "dijit/_TemplatedMixin",
        "mxui/dom",
        "dojo/dom-style",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dojo/html",
        "dojo/_base/array",
        "dojo/_base/lang",
        "dojo/text",
        "CKEditorForMendix/widget/lib/jquery-1.11.1",
        "CKEditorForMendix/widget/lib/ckeditor",
        "dojo/text!CKEditorForMendix/widget/templates/CKEditorForMendix.html",
        "CKEditorForMendix/widget/lib/jquery.oembed"
    ], function (declare, _WidgetBase, _TemplatedMixin, dom, domStyle, dojoClass, domConstruct, html, dojoArray, lang, text, _jQuery, _CKEditor, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true),
        Upload = mendix.lib.Upload;

    return declare("CKEditorForMendix.widget.CKEditorForMendix", [_WidgetBase, _TemplatedMixin], {

        // Set by the Modeler
        imageUploadMicroflow: "",

        // Internal values
        _contextGuid: null,
        _contextObj: null,
        _handles: null,
        _alertdiv: null,
        _hasStarted : false,
        _isReadOnly: false,
        _focus: false,

        // Extra variables
        _extraContentDiv: null,
        _editor: null,
        _resizePopup: true,
        _useImageUpload: false,
        _imageEntity: "",
        _imageReference: null,
        _setReference: false,

        ckeditorPlugins: [
            "divarea",
            "mendixlink",
            "tableresize",
            "oembed",
            "widget",
            "maximize",
            "uploadimage",
            "simple-image-browser",
            "pastebase64"
        ],

        // CKEditor instances.
        _settings: null,

        templateString: widgetTemplate,

        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            this._CKEditor = window.CKEDITOR;
            this._CKEditor.jQuery = $;
            this._CKEditor.getImages = lang.hitch(this, this.retrieveImages);

            if (this.imageentity) {
                var split = this.imageentity.split("/");
                if (split.length === 1) {
                    this._imageEntity = split[0];
                } else {
                    this._imageEntity = split[split.length - 1];
                    this._imageReference = split[0];
                    this._setReference = true;
                }
            }

            if( this.showLabel ) {
                if (dojoClass.contains(this.ckEditorLabel, "hidden")) {
                    dojoClass.remove(this.ckEditorLabel, "hidden");
                }
                this.ckEditorLabel.innerHTML = this.fieldCaption;
            } else {
                if (!dojoClass.contains(this.ckEditorLabel, "hidden")) {
                    dojoClass.add(this.ckEditorLabel, "hidden");
                }
            }

            if (this.readOnly || this.get("disabled") || this.readonly) {
                this._isReadOnly = true;
            }

            if (this.imagePasteMode === "upload") {
                if (this.imageentity) {
                    this._useImageUpload = true;
                } else {
                    console.warn(this.id + " you have set the Image mode to 'upload', but you have not set the entity yet");
                }
            }
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;

            this._resetSubscriptions();
            this._updateRendering(callback);
        },

        _setupEvents: function () {
            logger.debug(this.id + "._setupEvents");
            // On change event (== on keypress)
            this._editor.on("change", lang.hitch(this, function () {
                this._editorChange(this._editor.getData());

                if (this.onKeyPressMicroflow) {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: this.onKeyPressMicroflow,
                            guids: [this._contextObj.getGuid()]
                        },
                        store: {
                            caller: this.mxform
                        },
                        callback: function (obj) {
                        },
                        error: function (error) {
                            console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                        }
                    }, this);
                }
            }));

            this._editor.on("focus", lang.hitch(this, function (e) {
                this._focus = true;
            }));

            //On blur (unselecting the textbox) event
            this._editor.on("blur", lang.hitch(this, function (e) {
                this._focus = false;
                if (this._editor.checkDirty() && this.onChangeMicroflow) {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: this.onChangeMicroflow,
                            guids: [this._contextObj.getGuid()]
                        },
                        callback: lang.hitch(this, function (obj) {
                            this._editor.resetDirty();
                        }),
                        error: lang.hitch(this, function (error) {
                            console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                }

            }));
        },

        _executeMf: function (obj, mf, callback) {
            logger.debug(this.id + "._executeMf: ", mf);
            if (obj && mf !== "") {
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: mf,
                        guids: [obj.getGuid()]
                    },
                    store: {
                        caller: this.mxform
                    },
                    callback: callback || function () {},
                    error: lang.hitch(this, function (error) {
                        console.log(this.id + ": An error occurred while executing microflow: " + error.description);
                    })
                }, this);
            }
        },

        _editorChange: function (data) {
            logger.debug(this.id + "._editorChange:", data);
            if (this._contextObj !== null) {
                this._contextObj.set(this.messageString, data);
            }
        },

        _getPlugins: function (imageUpload) {
            var plugins = this.ckeditorPlugins;
            return plugins.join(",");
        },

        // Create child nodes.
        _createChildNodes: function (callback) {
            logger.debug(this.id + "._createChildNodes");
            this.CKEditorForMendixNode.appendChild(dom.create("textarea", {
                "name": "html_editor_" + this.id,
                "id": "html_editor_" + this.id,
                "rows": "10",
                "cols": "80"
            }));

            var seperator1 = null,
                seperator2 = null;

            // Create new config
            this._settings = [];
            this._settings[this.id] = {
                config: {
                    toolbarGroups: [],
                    oembed_WrapperClass: "embededContent"
                }
            };

            // Collapsable toolbar
            this._settings[this.id].config.toolbarCanCollapse = true;

            // Maximize offset
            this._settings[this.id].config.maximizeOffset = this.maximizeOffset;

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
            if (this.bodyCssClass !== "") {
                this._settings[this.id].config.bodyClass = this.bodyCssClass;
            }

            seperator1 = false;
            seperator2 = false;

            this._CKEditor.config.toolbarGroups = [];

            if (this.toolbarDocument) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "document",
                    groups: ["mode", "document", "doctools"]
                });
                seperator1 = true;
            }
            if (this.toolbarClipboard) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "clipboard",
                    groups: ["clipboard", "undo"]
                });
                seperator1 = true;
            }
            if (this.toolbarEditing) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "editing",
                    groups: ["find", "selection", "spellchecker"]
                });
                seperator1 = true;
            }
            if (this.toolbarForms) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "forms"
                });
                seperator1 = true;
            }

            if (this.toolbarSeperator1) {
                this._settings[this.id].config.toolbarGroups.push("/");
            }

            if (this.toolbarBasicstyles) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "basicstyles",
                    groups: ["basicstyles", "cleanup"]
                });
                seperator2 = true;
            }
            if (this.toolbarParagraph) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "paragraph",
                    groups: ["list", "indent", "blocks", "align", "bidi"]
                });
                seperator2 = true;
            }
            if (this.toolbarLinks) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "links"
                });
                seperator2 = true;
            }
            if (this.toolbarInsert) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "insert"
                });
                seperator2 = true;
            }

            if (this.toolbarSeperator2) {
                this._settings[this.id].config.toolbarGroups.push("/");
            }

            if (this.toolbarStyles) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "styles"
                });
            }
            if (this.toolbarColors) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "colors"
                });
            }
            if (this.toolbarTools) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "tools"
                });
            }
            if (this.toolbarOthers) {
                this._settings[this.id].config.toolbarGroups.push({
                    name: "others"
                });
            }

            this._settings[this.id].config.imageUploadUrl = "http://localhost/"; // not used
            if (!this._useImageUpload) {
                this._settings[this.id].config.extraPlugins = this._getPlugins(false);
                this._settings[this.id].config.removePlugins = "simple-image-browser,uploadimage";
            } else {
                this._settings[this.id].config.extraPlugins = this._getPlugins(true);
                this._settings[this.id].config.removePlugins = "pastebase64";
            }

            this._settings[this.id].config.extraAllowedContent = "*[data-*]";

            // Create a CKEditor from HTML element.
            this._editor = this._CKEditor.replace("html_editor_" + this.id, this._settings[this.id].config);

            // Set enterMode
            this._editor.config.enterMode = this._CKEditor["ENTER_" + this.enterMode];
            this._editor.config.shiftEnterMode = this._CKEditor["ENTER_" + this.shiftEnterMode];

            // Set autoparagraph
            this._editor.config.autoParagraph  = this.autoParagraph;

            // Attach Mendix Widget to editor and pass the mendix widget configuration to the CKEditor.
            this._editor.mendixWidget = this;
            this._editor.mendixWidgetID = this.id;
            this._editor.mendixWidgetConfig = {
                microflowLinks: this.microflowLinks
            };

            this._setupEvents();

            this._editor.on("instanceReady", lang.hitch(this, function(event) {
                logger.debug(this.id + "._createChildNodes editor ready, total height: " + $("#" + this.id).height() + ", calling _updateRendering");
                this._updateRendering(callback);
            }));

            if (this._useImageUpload) {
                this._editor.on( "fileUploadRequest", lang.hitch(this, this._fileUploadRequest));
            } else {

            }
        },

        _fileUploadRequest: function (evt) {
            logger.debug(this.id + "._fileUploadRequest");
            var fileLoader = evt.data.fileLoader,
                file = fileLoader.file;

            mx.data.create({
                entity: this._imageEntity,
                callback: lang.hitch(this, function (obj) {
                    logger.debug(this.id + "._fileUploadRequest Image entity created");

                    if (this._setReference && this._imageReference) {
                        this._contextObj.addReference(this._imageReference, obj.getGuid());
                    }

                    var guid = obj.getGuid();
                    var upload = new Upload({
                        objectGuid: guid,
                        startUpload: lang.hitch(this, function () {
                            logger.debug(this.id + "._fileUploadRequest uploading");
                            fileLoader.changeStatus("uploading");
                        }),
                        finishUpload: lang.hitch(this, function () {
                            logger.debug(this.id + "._fileUploadRequest finished uploading");
                        }),
                        form: {
                            mxdocument: {
                                files: [
                                    file
                                ]
                            }
                        },
                        callback: lang.hitch(this, function () {
                            logger.debug(this.id + "._fileUploadRequest uploaded");
                            fileLoader.url = "file?guid=" + guid;
                            fileLoader.guid = guid;
                            fileLoader.changeStatus("uploaded");

                            if (this.imageUploadMicroflow) {
                                this._executeMf(obj, this.imageUploadMicroflow);
                            }

                            this._editor.fire("change");
                        }),
                        error: lang.hitch(this, function (err) {
                            console.error(this.id + "._fileUploadRequest error uploading", arguments);
                            fileLoader.message = "Error uploading: " + err.toString();
                            fileLoader.changeStatus("error");
                        })
                    });

                    upload.upload();
                }),
                error: lang.hitch(this, function (err) {
                    logger.debug(this.id + "._fileUploadRequest Image entity failed to create");
                    fileLoader.message = "Error uploading: " + err.toString();
                    fileLoader.changeStatus("error");
                }),
                scope: this._contextObj
            });
            evt.stop();
        },

        _handleValidation: function (validations) {
            logger.debug(this.id + "._handleValidation");
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
            logger.debug(this.id + "._clearValidations");
            domConstruct.destroy(this._alertdiv);
        },

        _addValidation: function (msg) {
            logger.debug(this.id + "._addValidation");
            this._alertdiv = domConstruct.create("div", {
                "class": "alert alert-danger",
                innerHTML: msg
            });

            this.CKEditorForMendixNode.appendChild(this._alertdiv);
        },

        _updateAttrRendering: function () {
            if (!this._focus) {
                this._updateRendering();
            }
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            if (!this._editor && !this._isReadOnly) {
                this._createChildNodes(callback);
            } else {
                if (this._contextObj) {
                    domStyle.set(this.domNode, "visibility", "visible");

                    if (this._editor !== null) {
                        this._editor.setData(this._contextObj.get(this.messageString));
                    } else {
                        logger.warn(this.id + " - Unable to add contents to editor, no _editor object available");
                    }
                } else {
                    domStyle.set(this.domNode, "visibility", "hidden");
                }

                if (callback && typeof callback === "function") {
                    logger.debug(this.id + "._updateRendering.callback");
                    callback();
                }
            }
        },

        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            var objHandle = null,
                attrHandle = null,
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

                attrHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.messageString,
                    callback: lang.hitch(this,function(guid,attr,attrValue) {
                        this._updateAttrRendering();
                    })
                });

                validationHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, this._handleValidation)
                });

                this._handles = [objHandle, attrHandle, validationHandle];
            }
        },

        retrieveImages: function (callback) {
            this.retrieveImageObjects(lang.hitch(this,function (objs) {
                var images = [];
                dojo.forEach(objs, function (obj, i) {
                    images.push({
                        guid: obj.getGuid(),
                        thumbnailUrl: this._getFileUrl(obj.getGuid()) + "&thumb=true",
                        imageUrl:  "file?guid=" + obj.getGuid()
                    });
                }, this);
                callback(images);
            }));
        },

        _getFileUrl: function (guid) {
            var changedDate = Math.floor(Date.now() / 1); // Right now;
            return mx.appUrl + "file?" + [
                "guid=" + guid,
                "changedDate=" + changedDate
            ].join("&");
        },

		retrieveImageObjects : function (callback, offset, search) {
            logger.debug(this.id + ".retrieveImages");
			this._getObjects("//" + this._imageEntity + this.imageconstraint + this.getSearchConstraint("Name", search), callback);
		},

		_getObjects: function (query, callback) {
            logger.debug(this.id + "._getObjects");
			query = query.replace(/\[\%CurrentObject\%\]/gi, this._contextObj);
            mx.data.get({
                xpath: query,
                callback: callback
            });
		},

        getSearchConstraint: function (attr, search) {
            logger.debug(this.id + ".getSearchConstraint");
			if(dojo.isString(search) && dojo.isString(attr) && attr !== "") {
				return "[contains(" + attr + ", '" + html.escapeString(search) + "')]";
			}
			return "";
		},

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            if (this._editor) {
                this._editor.removeAllListeners();
                this._editor.destroy();
            }
        }
    });
});

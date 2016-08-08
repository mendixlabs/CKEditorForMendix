define([
        "dojo/_base/declare",
        "mxui/widget/_WidgetBase",
        "dijit/_TemplatedMixin",
        "mxui/dom",
        "dojo/query",
        "dojo/dom-style",
        "dojo/dom-class",
        "dojo/dom-construct",
        "dojo/html",
        "dojo/on",
        "dojo/_base/array",
        "dojo/_base/lang",
        "dojo/text",
        "CKEditorForMendix/widget/lib/jquery",
        "CKEditorForMendix/widget/lib/ckeditor",
        "dojo/text!CKEditorForMendix/widget/templates/CKEditorForMendix.html",
        "CKEditorForMendix/widget/lib/jquery.oembed"
    ], function (declare, _WidgetBase, _TemplatedMixin,
                 dom, query, domStyle, dojoClass,
                 domConstruct, html, dojoOn,
                 dojoArray, lang, text,
                 _jQuery, _CKEditor, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true),
        Upload = mendix.lib.Upload;

    return declare("CKEditorForMendix.widget.CKEditorForMendix", [_WidgetBase, _TemplatedMixin], {

        templateString: widgetTemplate,
        /**
         * Parameters configured in modeler
         */
        // Data source
        messageString: "",
        onKeyPressMicroflow: "",
        onChangeMicroflow: "",
        // Behavior
        enterMode: "P",
        shiftEnterMode: "BR",
        autoParagraph: true,
        // Appearance
        bodyCssClass: false,
        width: 0,
        height: 0,
        showLabel: false,
        fieldCaption: "",
        maximizeOffset: 0,
        showStatusBar: true,
        showToolbarCollapsed: false,
        // Microflow links
        microflowLinks: null,
        // Document
        toolbarDocument: true,
        toolbarClipboard: true,
        toolbarEditing: true,
        toolbarForms: true,
        toolbarSeperator1: true,
        toolbarBasicstyles: true,
        toolbarParagraph: true,
        toolbarLinks: true,
        toolbarInsert: true,
        toolbarSeperator2: true,
        toolbarStyles: true,
        toolbarColors: true,
        toolbarTools: true,
        toolbarOthers: true,
        // Images
        imageentity: null,
        imageconstraint: null,
        imagePasteMode: "base64",
        imageUploadMicroflow: "",
        // Count
        countPlugin: false,
        countPluginMaxCount: 0,

        /**
         * Configured in the template
         */
        ckEditorLabelNode: null,
        CKEditorForMendixNode: null,

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
        _sourceKeyHandle: null,

        ckeditorPlugins: [
            "divarea",
            "mendixlink",
            "tableresize",
            "oembed",
            "widget",
            "maximize"
        ],

        // CKEditor instances.
        _settings: null,
        /**
         * Called after constructing the widget. Implement to do extra setup work.
         */
        postCreate: function () {
            logger.debug(this.id + ".postCreate");

            this._CKEditor = window.CKEDITOR;
            this._CKEditor.jQuery = $;
            // As far as I can tell, the code below and all associate functions are not being used.
            this._CKEditor.getImages = lang.hitch(this, this.retrieveImages); // Sets a reference of the retrieveImages function to the getImages property

            this._setImagePaths();
            this._showLabel();

            if (this.readOnly || this.get("disabled") || this.readonly) { // Not sure where it's getting the readOnly property. Couldn't find it in the console
                this._isReadOnly = true;
            }

        },

        /**
         * Sets the Image Entity and Reference if configured in the modeler
         */
        _setImagePaths: function () {
            logger.debug(this.id + "._setImagePaths");
            if (this.imageentity) {
                var split = this.imageentity.split("/");
                if (split.length === 1) {
                    this._imageEntity = split[0];
                } else {
                    this._imageEntity = split[split.length - 1];
                    this._imageReference = split[0];
                    this._setReference = true;
                }
                if (this.imagePasteMode === "upload") {
                    this._useImageUpload = true;
                }
            }
        },
        /**
         * Check if user wants to show label and has set the caption then shows the label.
         * Caption is also configured in modeler.
         */
        _showLabel: function () {
            logger.debug(this.id + "._showLabel");
            if( this.showLabel && this.fieldCaption.trim() !== "") {
                if (dojoClass.contains(this.ckEditorLabelNode, "hidden")) {
                    dojoClass.remove(this.ckEditorLabelNode, "hidden");
                }
                html.set(this.ckEditorLabelNode, this.fieldCaption);
            } else {
                if (!dojoClass.contains(this.ckEditorLabelNode, "hidden")) {
                    dojoClass.add(this.ckEditorLabelNode, "hidden");
                }
            }
        },
        /**
         * Called when context is changed or initialized. Implement to re-render and / or fetch data
         * @param obj
         * @param callback
         */
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;

            if (obj && typeof obj.metaData === "undefined") {
                logger.warn(this.id + ".update Error: CKeditor was configured for an entity the current user has no access to.");
                mendix.lang.nullExec(callback);
            } else {
                this._resetSubscriptions();
                this._updateRendering(callback);
            }
        },
        /**
         * Attach events to HTML dom elements
         * @param callback
         * @private
         */
        _setupEvents: function (callback) {
            logger.debug(this.id + "._setupEvents");

            // On change event (== on keypress)
            this._editor.on("change", lang.hitch(this, function () {
                this._updateContextData(this._editor.getData());

                if (this.onKeyPressMicroflow) {
                    this._executeMf(this._contextObj, this.onKeyPressMicroflow);
                }
            }));

            this._editor.on("focus", lang.hitch(this, function (e) {
                this._focus = true;
            }));

            //On blur (unselecting the textbox) event
            this._editor.on("blur", lang.hitch(this, function (e) {
                this._focus = false;
                if (this._editor.mode !== "source" && this._editor.checkDirty() && this.onChangeMicroflow && !this._strReadOnly()) {
                    this._executeMf(this._contextObj, this.onChangeMicroflow, this._editor.resetDirty());
                }

            }));

            this._editor.on("mode", lang.hitch(this, function () {
                var textarea = query("textarea.cke_source", this.domNode);
                if (this._editor.mode === "source" && textarea.length > 0) {
                    this.own(dojoOn(textarea[0], "keyup", lang.hitch(this, function () {
                        this._editor.fire("change");
                    })));
                }
            }));

            this._editor.on("instanceReady", lang.hitch(this, function(event) {
                logger.debug(this.id + "._createChildNodes editor ready! Calling _updateRendering");
                this._addDataProcessorFilters();
                this._updateRendering(callback);
            }));

            this._editor.on( "fileUploadRequest", lang.hitch(this, this._fileUploadRequest));
        },
        /**
         * Executes a microflow mf, passes in obj and then executes callback on success
         * @param obj
         * @param mf
         * @param callback
         * @private
         */
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
        /**
         * Updates Context Object variable attached to Editor with the current editor content
         * @param data
         * @private
         */
        _updateContextData: function (data) {
            logger.debug(this.id + "._editorChange:");
            if (this._contextObj !== null) {
                this._contextObj.set(this.messageString, data);
            }
        },

        _getPlugins: function (imageUpload) {
            var plugins = [
                "divarea",
                "mendixlink",
                "tableresize",
                "oembed",
                "widget",
                "maximize"
            ];

            if (this._useImageUpload) {
                plugins.push("uploadimage");
                plugins.push("simple-image-browser");
            } else {
                plugins.push("pastebase64");
            }

            if (this.countPlugin) {
                plugins.push("wordcount");
            }

            logger.debug(this.id + "._getPlugins: " + plugins.join(","));

            return plugins.join(",");
        },
        /**
         * Represents a data processor which is responsible for
         * translating and transforming the editor data on input and output.
         * @param callback
         * @private
         */
        _addDataProcessorFilters: function () {
            // Add filters for images that have a data-image-guid tag
            event.editor.dataProcessor.dataFilter.addRules({
                elements: {
                    img: lang.hitch(this, function (element) {
                        var guid = element.attributes["data-image-guid"];
                        if (guid) {
                            element.attributes.src = this._getFileUrl(guid);
                        }
                    })
                }
            });

            event.editor.dataProcessor.htmlFilter.addRules ({
                elements: {
                    img: function (element) {
                        var guid = element.attributes["data-image-guid"];
                        if (guid) {
                            element.attributes.src = "file?guid=" + guid;
                        }
                    }
                }
            });

        },
        /**
         * Creates and configures an instance of the Editor
         * @param callback
         * @private
         */
        _createChildNodes: function (callback) {
            logger.debug(this.id + "._createChildNodes");
            var textAreaNode = dom.create("textarea", {
                "name": "html_editor_" + this.id,
                "id": "html_editor_" + this.id,
                "rows": "10",
                "cols": "80"
            });
            domConstruct.place(textAreaNode, this.CKEditorForMendixNode);

            this._configureEditor();

            // Create a CKEditor from HTML element.
            this._editor = this._CKEditor.replace("html_editor_" + this.id, this._settings[this.id].config);
            // More Configs
            this._editor.config.enterMode = this._CKEditor["ENTER_" + this.enterMode];
            this._editor.config.shiftEnterMode = this._CKEditor["ENTER_" + this.shiftEnterMode];
            this._editor.config.autoParagraph  = this.autoParagraph;
            // Attach Mendix Widget & Widget configuration to the CKEditor.
            this._editor.mendixWidget = this;
            this._editor.mendixWidgetID = this.id;
            this._editor.mendixWidgetConfig = {
                microflowLinks: this.microflowLinks
            };

            this._setupEvents(callback);

        },
        /**
         * Defines the specific settings for the CKEditor based on widget configurations
         * in the modeler
         * @private
         */
        _configureEditor: function () {
            logger.debug(this.id + " _configureEditor");
            // Create new config
            this._settings = [];
            // Object index in the array is based on widget ID because CKEditor
            // object is global and this is required to create unique settings
            // for multiple widget instances
            this._settings[this.id] = {
                config: {
                    toolbarGroups: [],
                    oembed_WrapperClass: "embededContent",
                    toolbarCanCollapse: true,
                    toolbarStartupExpanded: !this. showToolbarCollapsed,
                    maximizeOffset: this.maximizeOffset,
                    autoGrow_minHeight: 300,
                    autoGrow_onStartup: true,
                    baseHref: mx.appUrl,
                    imageUploadUrl: "http://localhost/", // not used
                    extraPlugins: this._getPlugins(),
                    removePlugins: this.showStatusBar ? "elementspath" : "",
                    resize_enabled: !this.showStatusBar,
                    width: this.width > 0 ? this.width : "",
                    height: this.height > 0 ? this.height : 200,
                    bodyClass: this.bodyCssClass,
                    extraAllowedContent: "*[data-*]"
                }
            };

            this._CKEditor.config.toolbarGroups = [];
            this._addToolbarGroups();
            this._addWordCountPlugin();

        },
        /**
         * Creates ToolbarGroups on Editor
         * If the toolbar layout is not explicitly defined by the toolbar setting,
         * then this setting is used to group all defined buttons.
         * @private
         */
        _addToolbarGroups: function () {
            this._addToolbarGroup(this.toolbarDocument, {
                name: "document",
                groups: ["mode", "document", "doctools"]
            });
            this._addToolbarGroup(this.toolbarClipboard, {
                name: "clipboard",
                groups: ["clipboard", "undo"]
            });
            this._addToolbarGroup(this.toolbarEditing, {
                name: "editing",
                groups: ["find", "selection", "spellchecker"]
            });
            this._addToolbarGroup(this.toolbarForms, {
                name: "forms"
            });
            this._addToolbarGroup(this.toolbarSeperator1, "/");
            this._addToolbarGroup(this.toolbarBasicstyles, {
                name: "basicstyles",
                groups: ["basicstyles", "cleanup"]
            });
            this._addToolbarGroup(this.toolbarParagraph, {
                name: "paragraph",
                groups: ["list", "indent", "blocks", "align", "bidi"]
            });
            this._addToolbarGroup(this.toolbarLinks, {
                name: "links"
            });
            this._addToolbarGroup(this.toolbarInsert, {
                name: "insert"
            });
            this._addToolbarGroup(this.toolbarSeperator2, "/");

            this._addToolbarGroup(this.toolbarStyles, {
                name: "styles"
            });
            this._addToolbarGroup(this.toolbarColors, {
                name: "colors"
            });
            this._addToolbarGroup(this.toolbarTools, {
                name: "tools"
            });
            this._addToolbarGroup(this.toolbarOthers, {
                name: "others"
            });
        },
        /**
         * Adds a single toolbar group to the editor.
         * @param add
         * @param toolbarOptions
         * @private
         */
        _addToolbarGroup: function(add, toolbarOptions) {
            if(add && toolbarOptions) {
                this._settings[this.id].config.toolbarGroups.push(toolbarOptions);
            }
        },
        /**
         * Adds the CKEditor Word count plugin that tracks & limits number of words used in the editor
         * @private
         */
        _addWordCountPlugin: function () {
            if (this.countPlugin) {
                this._settings[this.id].config.wordcount = {
                    showParagraphs: false,
                    showWordCount: true,
                    showCharCount: true,
                    countSpacesAsChars: true,
                    countHTML: true,
                    maxWordCount: -1,
                    maxCharCount: this.countPluginMaxCount > 0 ? this.countPluginMaxCount : -1
                };
            }
        },
        /**
         * Handles file upload requests from the Editor
         * @param evt
         * @private
         */
        _fileUploadRequest: function (evt) {
            logger.debug(this.id + "._fileUploadRequest");
            if (this._useImageUpload) {
                var fileLoader = evt.data.fileLoader,
                    file = fileLoader.file;

                mx.data.create({
                    entity: this._imageEntity,
                    callback: lang.hitch(this, function (obj) {
                        logger.debug(this.id + "._fileUploadRequest Image entity created");

                        if (this._setReference && this._imageReference) {
                            this._contextObj.addReference(this._imageReference, obj.getGuid());
                        }

                        // Normalize file name and size (sometimes doesn't work in firefox)
                        if (file.name === undefined && file.size === undefined) {
                            file.name = file.fileName;
                            file.size = file.fileSize;
                        }

                        var guid = obj.getGuid();
                        var upload = new Upload({
                            objectGuid: guid,
                            maxFileSize: file.size,
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
            } else {
                this._editor.on( "fileUploadRequest", lang.hitch(this, function () {
                    logger.warn(this.id + ": File Upload is disabled in widget settings!");
                }));
            }
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
        /**
         * Add a validation...
         * @param msg
         * @private
         */
        _addValidation: function (msg) {
            logger.debug(this.id + "._addValidation");
            this._alertdiv = domConstruct.create("div", {
                "class": "alert alert-danger",
                innerHTML: msg
            });

            this.CKEditorForMendixNode.appendChild(this._alertdiv);
        },

        /**
         * Checks and returns readOnly status
         * @returns {*}
         * @private
         */
        _strReadOnly: function () {
            return this._contextObj.isReadonlyAttr && this._contextObj.isReadonlyAttr(this.messageString);
        },
        /**
         * Rerender the widget interface.
         * @param callback
         * @private
         */
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            if (!this._editor && !this._isReadOnly) {
                this._createChildNodes(callback);
            } else {
                if (this._contextObj) {
                    domStyle.set(this.domNode, "visibility", "visible");
                    this._populateEditor();
                } else {
                    domStyle.set(this.domNode, "visibility", "hidden");
                }
                mendix.lang.nullExec(callback);
            }
        },
        /**
         * Add data to Editor and setReadOnly status
         * @private
         */
        _populateEditor: function () {
            if (this._editor !== null) {
                this._editor.setData(this._contextObj.get(this.messageString));
                this._editor.setReadOnly(this._strReadOnly());
            } else {
                logger.warn(this.id + " - Unable to add contents to editor: No _editor object available");
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
                        if (!this._focus) {
                            this._updateRendering();
                        }
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
            // inline callback for retrieveImageObjects function
            this.retrieveImageObjects(lang.hitch(this,function (objs) {
                var images = [];
                dojo.forEach(objs, function (obj, i) { // deprecated usage of dojo.forEach... Use dojo/_base/array instead
                    images.push({
                        guid: obj.getGuid(),
                        thumbnailUrl: this._getFileUrl(obj.getGuid()) + "&thumb=true",
                        imageUrl:  "file?guid=" + obj.getGuid()
                    });
                }, this);
                callback(images);// Should check if callback is a function before calling it
            }));
        },

        _getFileUrl: function (guid) {
            var changedDate = Math.floor(Date.now() / 1); // Right now; ED?? Why divide by 1??
            if (mx.data.getDocumentUrl) { // Couldn't find this function in API docs
                return mx.data.getDocumentUrl(guid, changedDate, false);
            }
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
        /**
         * Called when the widget is destroyed. Implement to do special tear-down work.
         */
        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            if (this._editor) {
                this._editor.removeAllListeners();
                this._editor.destroy();
            }
        }
    });
});

require(["CKEditorForMendix/widget/CKEditorForMendix"]);

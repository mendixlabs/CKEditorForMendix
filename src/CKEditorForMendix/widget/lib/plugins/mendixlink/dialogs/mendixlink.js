CKEDITOR.dialog.add( 'mendixlinkDialog', function( editor ) {
    return {
        title: 'Mendix Link Properties',
        minWidth: 400,
        minHeight: 200,

        contents: [
            {
                id: 'tab-basic',
                label: 'Settings',
                elements: [
                    {
                        type: 'text',
                        id: 'mxlinklabel',
                        label: 'Label of link',
                        
                        setup: function( element ) {
                            this.setValue( element.getText() );
                        },

                        commit: function( element ) {
                            element.setText( this.getValue() );
                        }
                    },{
                        type: 'select',
                        id: 'mxlink',
                        label: 'Name of link',
                        items: (function(){
                            var data = [],
                                i = null;
                            
                            if ( typeof editor.mendixWidgetConfig !== 'undefined' && typeof editor.mendixWidgetConfig.microflowLinks !== 'undefined' ){
                                console.log(editor);
                                
                                for (i = 0; i < editor.mendixWidgetConfig.microflowLinks.length; i++){
                                    data.push( [ editor.mendixWidgetConfig.microflowLinks[i].functionNames ] );
                                }
                                
                            }
                            console.log(data);
                            
                            return data;
                            
                        }()),
                        'default': '',
                        
                        setup: function( element ) {
                            this.setValue( element.getAttribute('href').split('javascript:CKEditorViewer.mf.exec(\'').join('').split('\', \'__ID__\', \'__GUID__\');').join('') );
                        },

                        commit: function( element ) {
                            element.setAttribute( 'href', 'javascript:CKEditorViewer.mf.exec(\'' + this.getValue() + '\', \'__ID__\', \'__GUID__\');' );
                        }
                    }
                ]
            }
        ],

        onShow: function() {
            var selection = editor.getSelection();
            var element = selection.getStartElement();
            var className = '';

            if ( element ) {
                element = element.getAscendant( 'a', true );
            }

            if ( !element || element.getName() != 'a' ) {
                element = editor.document.createElement( 'a' );
                element.setAttribute('class', 'mx-microflow-link');
                this.insertMode = true;
            }
            else {
                this.insertMode = false;
            }

            this.element = element;
            if ( !this.insertMode )
                this.setupContent( this.element );
        },

        onOk: function() {
            var dialog = this;
            var mxEl = this.element;
            this.commitContent( mxEl );

            if ( this.insertMode )
                editor.insertElement( mxEl );
        }
    };
});
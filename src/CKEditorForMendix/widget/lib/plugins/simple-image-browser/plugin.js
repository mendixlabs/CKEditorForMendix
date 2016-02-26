
/*
    Classy Image Browser for CKEditor allows you to load an directory with
    images / files and use them to include in your content.
    ---
    Author: EpicSoftworks

    Adapted by J.W. Lagendijk <jelte.lagendijk@mendix.com> to work in Mendix (Feb 2016)
 */

var getImages = CKEDITOR.getImages,
    $ = CKEDITOR.jQuery;

CKEDITOR.dialog.add('simple-image-browser-dialog', function(editor) {
  return {
    title: 'Simple Image Browser',
    minWidth: 800,
    minHeight: 400,
    maxWidth: 800,
    maxHeight: 400,
    contents: [
      {
        id: 'tab-step1',
        label: 'Browse for images',
        elements: [
          {
            type: 'html',
            align: 'left',
            id: 'titleid',
            style: 'font-size: 20px; font-weight: bold;',
            html: 'Browse for pictures'
          }, {
            type: 'html',
            align: 'left',
            id: 'msg',
            style: '',
            html: '<div id="imageBrowser"></div>'
          }
        ]
      }
    ]
  };
});


/*
    The plugin itself. Simple stuff.
 */

CKEDITOR.plugins.add('simple-image-browser', {
    init: function(editor) {

        editor.on('dialogShow', function(event) {
          var dialog = event.data;
          if (dialog.getName() === 'simple-image-browser-dialog') {
            CKEDITOR.getImages(function (images) {
                console.log(images);
                var txt = "";
                $.each(images, function(key, value) {
                    var element = [
                         "<div onclick=\"CKEDITOR.tools.simpleimagebrowserinsertpicture('",
                         value.imageUrl,
                         "');\" style=\"position:relative;width:75px;height:75px;margin:5px;background-image:url('",
                         value.thumbnailUrl,
                         "');background-repeat:no-repeat;background-size:125%;background-position:center center;float:left;\"></div>"
                    ].join("");
                    txt = txt + element;
                 });
                 return $('#imageBrowser').html(txt);
            });
          }
        });

        /*
            Add the command to open the dialog window.
         */
        editor.addCommand('simple-image-browser-start', new CKEDITOR.dialogCommand('simple-image-browser-dialog'));

        /*
            The method that injects the image into the editor.
         */
        CKEDITOR.tools.simpleimagebrowserinsertpicture = function(event) {
          var dialog, html;
          editor = CKEDITOR.currentInstance;
          dialog = CKEDITOR.dialog.getCurrent();
          html = '<img src="' + event + '" data-cke-saved-src="' + event + '" alt="' + event + '" />';
          editor.config.allowedContent = true;
          editor.insertHtml(html.trim());
          dialog.hide();
        };

        /*
            Add a button to the editor to fire the command that opens the dialog
         */
        editor.ui.addButton('Simple Image Browser', {
          label: 'Simple Image Browser ',
          command: 'simple-image-browser-start',
          icon: this.path + 'images/icon.png'
        });
    }
});

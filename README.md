# CKEditor for Mendix

This [widget](https://appstore.home.mendix.com/link/app/1715/Mendix/CKEditor-For-Mendix) gives you a full version of the CKEditor with an extra button that allows you to create microflow links inside your HTML output.

![test](https://github.com/mendix/CKEditorForMendix/raw/master/assets/mendix_button.png)

Current [CKEditor version](http://ckeditor.com/whatsnew): 4.5.4

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Typical usage scenario

Use this widget to add a full WYSIWYG editor for your entity attributes. This version has the ability to add links to HTML that can run microflows when clicked uppon.
 
## Description

The CKEditor widget comes with the CKEditor viewer. This viewer will enable the posibility to reformat links to microflow links.

- The viewer needs an entity and attribute where it can get the HTML code.
- You can style the link as a button or just text.
- Within the CKEditor widget configure labels that can be placed with the mendix link button.
- These labels can be configured in the viewer to execute a microflow.
- The microflow will get the entity from the viewer widget.

### Example of the entire editor

![test](https://github.com/mendix/CKEditorForMendix/raw/master/assets/ckeditor.png)

### Example of the end result in mendix.

![test](https://github.com/mendix/CKEditorForMendix/raw/master/assets/example_result.png)

### Example of someone clicking the button.

![test](https://github.com/mendix/CKEditorForMendix/raw/master/assets/microflow_executed.png)

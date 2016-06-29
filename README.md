# kahnjs
A framework for asynchronous web apps built on top of backbonejs.

##App Initialization

###index.html
Initializes requirejs

###scripts/requirejs
Initializes jquery, underscore, backbone, and kahn. Loads scrips/app.js page.

###scripts/app.js
Instantiates modelApp. then instatiates viewApp. modelApp is passed as an argument to viewApp.

###scripts/modelApp.js
The `"_init"` method is called, which loads the user-defined config.json file and sets it as a hash of attributes on modelApp. The `"_init"` method then calls the `"buildPages"` method which creates a child model for each attribute hash defined in modelApp's `pages` array attribute. The user-defined `childClasses` property of modelApp is used to match the appropriate model class to each child model object that is to be instantiated. The `"buildPages"` method is recursive and creates all descendant models as defined in config.json and per the `childClasses` property defined in each successive child model class.

###scripts/viewApp.js

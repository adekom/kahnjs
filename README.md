# kahnjs
A framework for asynchronous web apps built on top of backbonejs.

##Classes
####Kahn.Model.Page
#####childClasses
JSON hash containing child classes associated with an object guid defined in config.json. An asterisk `"*"` can be used as a wild card to match any guid that is not specifically named in a key-value pair:
`{
	"home": ViewPageHome,
	"products": ViewPageProducts,
	"services": ViewPageServices,
	"*": ViewPageNotFound
}`

#####initiate
#####preload
#####load
#####attach

####Kahn.Model.App
Basically the same as `Kahn.Model.Page` except that this is the top level model. Contains one additional property `configLocation` that needs to be defined in order to set up the entire web app structure of models and views.

#####configLocation
A path or URL to a JSON config file that contains a hierarchy for models and views that represent the web app structure. See section below called "Config JSON" for additional information on how to properly structure this file.

####Kahn.View.App
####Kahn.View.Page
####Kahn.Router
####Kahn.Object

##Config JSON


##App Initialization
###index.html
Initializes requirejs

###scripts/requirejs
Initializes jquery, underscore, backbone, and kahn. Loads scrips/app.js page.

###scripts/app.js
Instantiates modelApp. then instantiates viewApp. modelApp is passed as an argument to viewApp.

###scripts/modelApp.js
The `"_init"` method is called, which loads the user-defined config.json file and sets it as a hash of attributes on modelApp. The `"_init"` method then calls the `"buildPages"` method which creates a child model for each attribute hash defined in modelApp's `pages` array attribute. The user-defined `childClasses` property of modelApp is used to match the appropriate model class to each child model object that is to be instantiated. The `"buildPages"` method is recursive and creates all descendant models as defined in config.json and per the `childClasses` property defined in each successive child model class.

###scripts/viewApp.js


//		 Kahn.js 1.0.0

//		 (c) 2015 Anton Dekom
//		 Kahn may be freely distributed under the MIT license.

(function(factory) {
	var root = (typeof self == "object" && self.self == self && self) || (typeof global == "object" && global.global == global && global);

	if (typeof define === "function" && define.amd) {
		define(["underscore", "jquery", "backbone", "exports"], function(_, $, backbone, exports) {
			root.Kahn = factory(root, exports, backbone, _, $);
			});
	}

}(function(root, Kahn, Backbone, _, $) {

	Kahn.VERSION = "1.0.0";

	// Kahn.Object
	// -------------

	// Kahn.Object contains a handful of properties and methods that are used
	// by both Kahn.Model and Kahn.View. Kahn.Object is extended and not
	// intended to be instantiated
	Kahn.Object = {

		// Create a deferred object for each asynchronous method and add it to
		// the methods property.
		_createMethod: function(method) {
			this.methods[method] = $.Deferred();
			// Deferred objects for specific methods must be set to resolved by
			// default in order to accurately convey the view's state upon
			// initialization.
			if(method === "erase" || method === "close" || method === "closePage") {
				this.methods[method].resolve();
			}
		},

		// A reference to the ancestor object
		ancestor: null,

		// A reference to the parent objects
		parent: null,

		// An array of all descendants objects
		descendants: null,

		// An array of all children objects
		children: null,

		// This should be overriden with an object hash containing view classes
		// associated with each model guid. '*' Can be used as a wild card to
		// match all guids not listed. The view classes should extend the
		// Kahn.Page class. The hash should follow the format below:
		// {
		//		 "home": ViewPageHome,
		//		 "products": ViewPageProducts,
		//		 "services": ViewPageServices,
		//		 "*": ViewPageNotFound
		// }
		childClasses: undefined,

		// The methods property contains deferreds objects that represent
		// the state of each of the object's methods.
		methods: null,

		// Using Backbone's initialize function to set up each object. The _init
		// method contains class-specific initialization logic. The initiate
		// method is intended to be overridden.
		initialize: function() {
			this._check();
			this.methods = [];
			$.each(this._methods, _.bind(function(index, value) {
				this._createMethod(value);
			}, this));
			this._init();

			// Set array properties of class to empty arrays.
			this.children = [];
			this.descendants = [];

			// Call to overriden initiate method.
			$.when(this.methods.initiate.promise(), this.methods._init.promise())
			.done(_.bind(function() {
				this.methods.initialize.resolve();
			}, this));
			this.initiate.apply(this, arguments);
		},

		// Create child objects as defined in the childClasses hash and set up
		// hierarchical relationships between objects
		buildPages: function(model) {
			// if child classes are defined, then begin building child instances
			if(this.childClasses !== undefined) {

				// Check that pages attribute of model contains array so that
				// child pages can be properly created
				if(model.get("pages") !== undefined && model.get("pages") !== null && model.get("pages").constructor === Array) {
					var deferreds = [];

					// Loop through array to create child for each value
					$.each(model.get("pages"), _.bind(function(index, value) {
						var pageJSON = value;

						// Find class definition in childClasses hash that
						// matches guid
						if(this.childClasses.hasOwnProperty(pageJSON.guid)) {
							var childClassKey = pageJSON.guid;
						} else if(this.childClasses.hasOwnProperty("*")) {
							var childClassKey = "*";
						} else {
							console.error("Setup error. Cannot find child class that corresponds to model with guid `" + pageJSON.guid + "`. Child class must be defined in the `childClasses` hash.");
							return false;
						}

						// Create child
						if(this instanceof Kahn.Model.Page) {
							var child = new this.childClasses[childClassKey](pageJSON);
							this.ancestor.descendants.push(child);
							this.descendants.push(child);
							this.children.push(child);
							child.ancestor = this.ancestor;
							child.parent = this;
							deferreds.push(child.methods.buildPages.promise());
							child.buildPages(child);
						} else {
							var child;
							// this each can be replaced with an _.find()
							$.each(this.ancestor.model.descendants, _.bind(function(index, value) {
								var model = value;
								if(model.get("guid") === pageJSON.guid) {
									child = new this.childClasses[childClassKey]({model: model});
									this.ancestor.descendants.push(child);
									this.descendants.push(child);
									this.children.push(child);
									child.ancestor = this.ancestor;
									child.parent = this;
									deferreds.push(child.methods.buildPages.promise());
									child.buildPages(model);
								}
							}, this));
						}

					}, this));

					$.when.apply($, deferreds).done(_.bind(function() {
						this.methods.buildPages.resolve();
					}, this));
				} else {
					console.error("JSON database error. The `pages` key must be defined and should contain array of child page objects.");
				}
			} else {
				this.methods.buildPages.resolve();
			}
		}

	};

	Kahn.Model = {};

	// Kahn.Model.Page
	// -------------

	// Extends Backbone.Model. Contains predefined methods for loading data at
	// various times during app initialization and navigation.
	Kahn.Model.Page = Backbone.Model;
	_.extend(Kahn.Model.Page.prototype, Kahn.Object, {

		// Class-specific initialization logic. Currently empty.
		_init: function() {
			this.methods._init.resolve();
		},

		// Check to ensure instances of this class have been set up properly.
		_check: function() {},

		// Array used to generate deferred objects that correspond to this
		// class's asynchronous methods
		_methods: ["_init", "initialize", "initiate", "build", "buildPages", "preload", "load", "attach"],

		// The initiate methos is empty by default and should be overriden
		// with custom initialization logic.
		initiate: function() {
			this.methods.initiate.resolve();
		},

		// The preload method is called once the app has finished loading and
		// rendering the first page that is visited. Override this method with
		// preload logic to reduce time needed to load and render pages a user
		// may navigate to.
		preload: function() {
			this.methods.preload.resolve();
		},

		// The load method is called when a user clicks a link that activates
		// a new view. Override the method with all data load logic needed to
		// populate the model so that the view's template can be rendered.
		load: function() {
			this.methods.load.resolve();
		},

		// The attach method is called once the view associated with this model
		// has completed rendering. Override the method to load additional
		// data in the background.
		attach: function() {
			this.methods.attach.resolve();
		}

	});

	// Kahn.Model.App
	// -------------

	// Description
	Kahn.Model.App = Kahn.Model.Page.extend({

		// URL to JSON object. Must be overridden.
		dataLocation: null,

		//
		_check: function() {
			// need to check that structure of JSON is correct, that guids are unique.
			// console.warn("JSON database error. Each `guid` defined in the JSON database must be unique.");
		},

		_init: function() {
			$.get(this.dataLocation)
			.success(_.bind(function(data) {
				this.set(data);
				this._check();
				this.ancestor = this;
				this.buildPages(this);
				this.methods._init.resolve();
			}, this))
			.fail(function(jqXHR, textStatus, errorThrown) {
				console.error("JSON database error. Could not get JSON file designated in the dataLocation property of the App Model.");
				return false;
			});
		},

		preloadPages: function() {
			$.each(this.descendants, _.bind(function(index, value) {
				var pageModel = value;
				pageModel.preload();
			}));
		}

	});

	Kahn.View = {};

	// Kahn.View.Page
	// -------------

	// description
	Kahn.View.Page = Backbone.View;

	_.extend(Kahn.View.Page.prototype, Kahn.Object, {

		// A selector for all <a> elements rendered in the view that cause
		// a child page to become active. This should be overridden if the view
		// has child views.
		childLinkSelector: null,

		_check: function() {
			return true;
		},

		//
		_init: function() {
			// Create click events.
			this.createEvents();
			this.methods._init.resolve();
		},

		//
		_methods: ["_init", "initialize", "initiate", "buildPages", "render", "erase", "build", "open", "close"],

		// Create backbone events hash to include click listener using the
		// overriden childLinkSelector.
		createEvents: function() {
			if(this.childLinkSelector !== undefined && this.childLinkSelector !== null) {
				this.events = {};
				this.events["click " + this.childLinkSelector] = function(e) {
					e.stopPropagation();
					Backbone.history.navigate($(e.currentTarget).attr("href"), {trigger: true});
					return false;
				}
				this.delegateEvents();
			}
		},

		// Initiate is an empty method by default that should be overriden
		// with custom initialization logic.
		initiate: function() {
			this.methods.initiate.resolve();
		},

		// The render method creates the view's HTML elements and inserts them
		// into the DOM. It should be overridden, and the view's methods
		// object should be appropriately changed when complete.
		render: function() {
			this.methods.erase = $.Deferred();
			this.methods.render.resolve();
		},

		// The erase method removes the view's HTML elements from the DOM. It
		// should be overridden, and the view's methods object should be
		// appropriately changed when complete.
		erase: function() {
			this.methods.render = $.Deferred();
			this.methods.erase.resolve();
		},

		// The open method is the broadest method for making a view active.
		open: function() {
			$.when(this.methods.render.promise()).done(_.bind(function() {
				this.methods.close = $.Deferred();
				this.methods.open.resolve();
			}, this));
			this.render();
		},

		// The close method is the broadest method for making a view inactive.
		close: function() {
			$.when(this.methods.erase.promise()).done(_.bind(function() {
				this.methods.open = $.Deferred();
				this.methods.close.resolve();
			}, this));
			this.erase();
		}

	});

	// Kahn.View.App
	// -------------

	// description
	Kahn.View.App = Kahn.View.Page.extend({

		// This should be overriden with a reference to the router object.
		router: undefined,

		// A reference to the page view that is currently active.
		childCurrent: null,

		// This is the guid associated with the default page that should be
		// activated if no guid is provided in the URL.
		childGuidDefault: undefined,

		// Check that view is being set up properly
		_check: function() {
			if(this.childGuidDefault === undefined) {
				console.error("View setup error. View's property childGuidDefault not defined.");
				return false;
			}

			if(this.childClasses === undefined) {
				console.error("View setup error. View's property childClasses not defined.");
				return false;
			}

			if(this.router === undefined) {
				console.error("View setup error. View's property router not defined.");
				return false;
			}

			return true;
		},

		//
		_init: function() {
			// Create click events.
			this.createEvents();

			// Set ancestor property
			this.ancestor = this;

			// Create child page views once model has finished initialization.
			$.when(this.model.methods.initialize.promise())
			.done(_.bind(function() {
				$.when(this.methods.buildPages.promise())
				.done(_.bind(function() {
					this.open();
				}, this));
				this.buildPages(this.model);
			}, this));

			// Listen to router for changes to URL.
			this.router.on("page", _.bind(function() {
				this.changePage();
			}, this));

			this.methods._init.resolve();
		},

		//
		_methods: ["_init", "initialize", "initiate", "build", "buildPages", "render", "erase", "open", "openPage", "close", "closePage"],

		// Make this view active. Render this view and open any child view.
		open: function() {
			$.when(this.methods.render.promise())
			.done(_.bind(function() {
				$.when(this.methods.openPage.promise())
				.done(_.bind(function() {
					this.methods.close = $.Deferred();
					this.methods.open.resolve();
					this.model.preloadPages();
				}, this));
				this.openPage();
			}, this));
			this.render();
		},

		// Makes a child view active. Finds the appropriate view in the
		// pageViews array, calls the load method of the model corresponding
		// to the view, then calls the open method of the view.
		openPage: function() {
			if(this.router.page === null) {
				pageGuid = this.childGuidDefault;
			} else {
				pageGuid = this.router.page;
			}
			var pageView = _.find(this.descendants, function(pageView) {
				return pageView.model.get("guid") === pageGuid;
			});
			$.when(pageView.model.methods.load.promise())
			.done(_.bind(function() {
				this.childCurrent = pageView;
				$.when(pageView.methods.open.promise())
				.done(_.bind(function() {
					pageView.model.attach();
					this.methods.closePage = $.Deferred();
					this.methods.openPage.resolve();
				}, this));
				pageView.open();
			}, this));
			pageView.model.load();
		},

		// Closes the currently open child view.
		closePage: function() {
			$.when(this.childCurrent.methods.close.promise())
			.done(_.bind(function() {
				this.methods.openPage = $.Deferred();
				this.childCurrent = null;
				this.methods.closePage.resolve();
			}, this));
			this.childCurrent.close();
		},

		// Closes the currently open child view and opens a different child
		// view.
		changePage: function() {
			$.when(this.methods.closePage.promise())
			.done(_.bind(function() {
				this.openPage();
			}, this));
			this.closePage();
		}
	});

	return Kahn;

}));

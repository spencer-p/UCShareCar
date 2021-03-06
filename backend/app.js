/*
 * app.js
 *
 * This file defines all of the handlers for the server. It exports the
 * expressjs object as "app".
 *
 * The handlers have a number of dependencies. Some are initialized elsewhere and
 * so can be mocked out easily. These include:
 *	- The database (db.js)
 *	- The notification service (notifications.js)
 * Note that if these are not initialized before starting the server, it is an
 * error.
 * 
 * Some other dependencies do not have to be initialized. They should still be
 * mocked out, however, to avoid side effects while unit testing. These include:
 *  - Google login (google_login.js)
 *  - Session cookie helpers (session_helpers.js)
 *
 * The server does not have a constructor, so there is no explicit dependency
 * injection.  The dependencies are all implicitly defined. This means that we
 * can take advantage of dynamic typing to mock things out for testing.
 *
 * Handler Results
 * All responses come as JSON. They should all have a "result" field which will
 * be 0 for failure and 1 for success. If the result is 1, there should always
 * be an "error" field that reports why the handler failed. The rest of the JSON
 * object is up to the discretion of each handler (see individual comments). The
 * exception to the "result" rule is the login handlers, which use "success",
 * which we are not going to change to avoid regression issues.
 *
 * Lastly, note that this file does not contain any code for actually running
 * the server. It simply defines all the handlers and returns the expressjs
 * app object. This means that whatever file imports this has to run the server
 * itself, and it then has more control over what it sets up (potentially
 * injecting dependencies) before starting the server.
 */
const secrets = require('./secrets')

// Express
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const app = express()
app.use(cookieParser(secrets.COOKIE))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const google_login = require('./google_login')
const sessions = require('./session_helpers')
const db = require('./db.js')
const notifications = require('./notifications')

// For checking that the server is running.
app.get('/', (req, res) => {
	console.log('Requested index')
	res.json({result: 1})
})

/*
 * POST request to create/register a new user
 * Expects a field "token" in the request body. Verifies with google.
 * Returns a JSON object with two fields:
 *	"success": true if the user is now logged in, false otherwise
 *	"needs_register": true if the user should be prompted to register, false o/w
 */
app.post('/users/login', async (req, res) => {
	// Check if the request actually has a token
	if (req.body.token === undefined) {
		console.log("Got a login request w/o a token")
		res.json({success: false, needs_register: false})
	}

	// TODO Despite using promises, I seem to have not avoided callback hell.

	// Verify with google
	google_login.verify(req.body.token).then((user) => {
		// If verified, check if they are registered or not
		db.user.check_registered(user.email).then((id) => {
			// Executed if the user is verified

			console.log("Verified login from", id)
			sessions.create(res, id)
			res.json({success: true, needs_register: false, user_id: id})
		},
		() => {
			// Executed if the user is not in the database
			console.log("Recieved a login from unregistered user. Setting cookies and saving their info.")

			// Save their information (w/o phnum)
			db.user.create({
				'name': user.name,
				'email': user.email,
			}).then((id) => {
				// If we succeeded, then set their session cookie (save their
				// user id) and tell them to register
				sessions.create(res, id)
				res.json({success: false, needs_register: true, user_id: id})
			}, (err) => {
				// If they were not saved, send a failure
				res.json({success: false, needs_register: false})
			})
		})
	}, (err) => {
		console.log("Could not verify user, returning fail:", err)
		res.json({success: false, needs_register: false})
	})
})

/*
 * Logs out the user by deleting their session.
 * Takes no arguments. Always returns {result: 1}, if you already have a
 * session.
 */
app.post('/users/logout', (req, res) => {
	if (!sessions.validate(req, res)) return

	console.log("Logging out user", req.signedCookies.session.id)
	sessions.destroy(res)
	res.json({result: 1})
})

/*
 * Registers a user. Users should have already attempted a login -- this handler
 * only completes the process of setting up a user. It essentially only adds the
 * phone number.
 * It expects a field "phnum" in the request body. This is a string representing
 * their phone number.
 * Return value has two fields:
 *	"success": true if user successfully registered, else false
 *	"error": an error if there was one, o/w undefined
 */
app.post('/users/register', (req, res) => {
	if (!sessions.validate(req, res)) return

	// Check for the phone number actually being passed
	if (req.body.phnum === undefined) {
		console.log("Missing phone number to register")
		res.json({success: false, error: 'Did not recieve a phone number'})
	}

	// Save the phnum
	console.log("Saving phnum for", req.signedCookies.session.id)
	db.user.add_phnum(req.signedCookies.session.id, req.body.phnum).then(() => {
		res.json({success: true})
	}, () => {
		res.json({success: false})
	})
})

/*
 * Returns a user with id specified in the body as "user_id".
 * Returns:
 *	result: 1 if success, 0 o/w
 *	error: an error string if result was 0
 *	user: the user document if successful
 */
app.get('/users/by_id/:user_id', (req, res) => {
	if (!sessions.validate(req, res)) return

	// Check user_id was sent
	if (req.params.user_id === undefined) {
		console.log("Missing user id to find user by id")
		res.json({result: 0, error: 'Did not recieve an ID'})
		return
	}

	db.user.find_with_id(req.params.user_id).then((user) => {
		res.json({result: 1, user: user})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

/*
 * Sets a given users FCM token. This allows us to send push notifications to
 * them. Expects a "token" in the body. Returns the standard {result, error}.
 */
app.post('/users/register_fcm', (req, res) => {
	if (!sessions.validate(req, res)) return

	// Check token was sent
	if (req.body.token === undefined) {
		console.log("Missing token to register user with FCM")
		res.json({result: 0, error: 'Did not recieve token'})
		return
	}

	db.user.set_fcm_token(req.signedCookies.session.id, req.body.token).then(() => {
		console.log("Registered an FCM token for", req.signedCookies.session.id)
		res.json({result: 1})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

/*
 * Returns all posts in the database. Takes no arguments. Return JSON object has
 * two fields:
 *	result: 1 if success, else 0
 *	posts: an array of all posts.
 */
app.get('/posts/all', (req, res) => {
	if (!sessions.validate(req, res)) return

	db.post.find_all().then((posts) => {
		res.json({result: 1, posts: posts})
	}, (err) => {
		return res.status(500).send({result: 0, error : 'database failure'})
	})
})

/*
 * Returns one post with the given ID. The id is to be passed in the request
 * body in JSON as the field "post_id". Return value, in JSON, has two fields:
 *	result: 1 if success, else 0
 *	post: the post whose id was requested
 */
app.get('/posts/by_id/:post_id', (req, res) => {
	if (!sessions.validate(req, res)) return

	if (!req.params.post_id) {
		res.json({result: 0, error: 'No post_id passed'})
		return
	}

	db.post.find_with_id(req.params.post_id).then((post) => {
		if (post == null) {
			return res.status(404).json({result: 0, error: 'post not found'})
		}
		else {
			res.json({result: 1, post: post})
		}
	}, (err) => {
		return res.status(500).json({result: 0, error: err})
	})
})

/*
 * Returns result posts of searching
 */
app.get('/posts/search/:start/:end', (req, res) => {
	if (!sessions.validate(req, res)) return
	
	db.post.search(req.params).then((posts) => {
		res.json({result: 1, posts: posts})
	}, (err) => {
		return res.status(500).send({result: 0, error : 'database failure'})
	})
})

/*
 * Returns posts for My Page in the application
 */ 
app.get('/posts/my_page', (req, res) => {
	if(!sessions.validate(req, res)) return

	db.post.my_page(req.signedCookies.session.id).then((posts) => {
		res.json({result: 1, posts: posts})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

/*
 * Creates a new post. All the data associated with the post must be in the
 * field "post" in the request body. The return value has two fields:
 *	result: 1 if good, else 0
 *	post_id: the ID of the post that was created, otherwise undefined
 */
app.post('/posts/create', (req, res) => {
	if (!sessions.validate(req, res)) return

	if (!req.body.post) {
		res.json({result: 0, error: 'No post passed to create'})
		return
	}

	// Set the uploader of this post
	req.body.post.uploader = req.signedCookies.session.id
	
	// Set the first person in the post. If the client sent driverneeded, they
	// become a passenger, otherwise a driver.
	if(req.body.post.driverneeded) {
		req.body.post.passengers.push(req.signedCookies.session.id)
	}
	else {
		req.body.post.driver = req.signedCookies.session.id
	}

	db.post.create(req.body.post).then((id) => {
		res.json({result: 1, post_id: id})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

/*
 * Updates a post with whatever is passed to it. This relies on some serious
 * trust the the frontend will not mangle posts.
 * Send the updated post as "post" in the JSON request body. Returns:
 *	result: 1 if success, 0 o/w
 *	error: an error if one occurred.
 */
app.post('/post/update', (req, res) => {
	if (!sessions.validate(req, res)) return
	
	if (!req.body.post) {
		res.json({result: 0, error: "no post passed"})
		return
	}

	db.post.update(req.body.post).then(() => {
		// Post was successful, we want to send an update to everyone except for
		// the current user making this request
		notifications.send_by_postid(req.body.post._id, req.signedCookies.session.id)

		res.json({result: 1})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

/*
 * Adds a passenger to a given post. The post to be added to is passed by ID in
 * post_id, in the request body. The user that will be added as a passenger is
 * the user that is making this request. The user will NOT be added as the
 * passenger if there is no driver or if there is no space.
 * Return value:
 *	result: 1 if success, else 0
 *	error: an error string if there was one
 */
app.post('/posts/add_passenger', (req, res) => {
	if (!sessions.validate(req, res)) return

	if (!req.body.post_id) {
		res.json({result: 0, error: 'No post id'})
		return
	}

	db.post.add_passenger(req.body.post_id, req.signedCookies.session.id).then(() => {
		// Post was successful, we want to send an update to everyone except for
		// the current user making this request
		notifications.send_by_postid(req.body.post_id, req.signedCookies.session.id)

		res.json({result: 1})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

/*
 * Adds the user making the request as the driver for the post with post_id
 * specified in the request body.
 * Return value:
 *	result: 1 if success, else 0
 *	error: an error string if there was one
 */
app.post('/posts/add_driver', (req, res) => {
	if (!sessions.validate(req, res)) return

	if (!req.body.post_id) {
		res.json({result: 0, error: 'No post id'})
		return
	}

	db.post.add_driver(req.body.post_id, req.body.avail, req.signedCookies.session.id).then(() => {
		// Post was successful, we want to send an update to everyone except for
		// the current user making this request
		notifications.send_by_postid(req.body.post_id, req.signedCookies.session.id)

		res.json({result: 1})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

app.put('/posts/update/:post_id', (req, res) => {
	if (!sessions.validate(req, res)) return

	db.post.update_post(req.signedCookies.session.id, req).then((post) => {
	//db.post.update_post(0x5b47e4068f0c2cf5fd5b785a, req).then((post) => {
		if(post == null) {
			return res.status(404).json({error: 'post not found'})
		}
		else {
			res.json({result: 1})
		}
	}, (err) => {
		res.json({result: 0})
	})
})

app.post('/report', (req, res) => {
	if (!sessions.validate(req, res)) return

	db.report.create_report(req.signedCookies.session.id, req.body.report).then((report) => {
	//db.report.create_report(0x5b47e4068f0c2cf5fd5b785a, req.body).then((report) => {
		res.json({result: 1, report_id: report._id})
	}, (err) => {
		res.json({result: 0, error: err})
	})
})

module.exports = app

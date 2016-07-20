
## UNDOCUMENTED
* The limit for production link seems to be 2000 and sandbox is 200.
* If you get all artifacts it will default to a workspace so, to get all artifacts from another workspace you need to add a parameter.
* There is no user story type in artifacts.
* Webhooks are not in the sdk (just an api)
* The SDK is client only (and does not work with the sandbox)
* Operators that don't need a value only work with Attribute ID (not attribute name)
* Workspace belongs to subscription
* there is a revision history so we can pull in past data (might be easier to just check the revision history)
* Seems like the same attribute can have a different ID for different artifacts (but is rally wide)
* Read-only key will show read only values (even if you do not edit them), so use full access
* To log out of postman basic auth you gotta send false token and not choose basic auth
* The webservice documentation updates to match the selected workspace


## RALLYDEV
Seems like the watcher could be very useful to trigger events.
Visualization wouldn't really help as there is not enough data.

How do you use rally?
* What happens when a new version is released (do you create a new board, branch out etc)?
* How do you handle an issue (ticket?)?
* What if you come up with a new feature (eg. where does it go if it's under consideration or under development?)?
* Do you keep team member performance metrics (eg. hours worked)?
* What columns do you have on each board?
* How many boards do you have and what are they for?


## SUPPORT SYSTEM
We can integrate with the help files.

### STATIC/GOALS DASHBOARD

Create a dashboard to answer questions about how people use the ticketing system:

* Do people look at the help docs?
* How are tickets distributed by priority?
* Show most relevant ticket pages
* Show ticket trends over long period (check if there are more tickets on release)
* Increase in help tickets from last month (show avg and percent increase)


### REALTIME/USABILITY DASHBOARD

Show realtime data about the ticketing system:

* Show trends in ticket priority (eg. sudden spike in high priority tickets)
* Show most recent critical tickets
* Show tends in ticket categories
* Find companies with most tickets (eg. in the past week)
* Increase in help tickets from yesterday


## BUSSINESS INTELLIGENCE
???
* Frontend is not following the patterns defined in docs/FRONTEND_CONVENSIONS.md (for example, `MemberDrawer` in `team-page.ts` should be a separate file.)
* `team-api-server.ts`, `team-types.ts` and `team-api-client.ts` seem to be going off pattern, either consolidate in their respective files, or implement the same segregation for other modules in the app.
* Updating profile should
* Current logged in user should be able to update their own profile information from the teams page (firstname, lastname). The save button should be enabled while the email field should be read-only
* Email field should not be editable for the user if they are active. Only when they are pending invite.
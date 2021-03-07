## https://apikit.net 's Login/Register/Password_Reset pages and backend.

# Specifications
- We used Collections but it dont work with clusters, now we use simple SQL database in password reset backend. ( quick.db )
- Password Reset requests deleting every 06.00 AM
- EJS supported. You dont need public jsons or dbs
- Backend operation request type is POST. Daily users cant see it.
- Mongo.DB supported, i think.. better than SQL or Firebase.
- Default password cryption => MD5-MD5-SHA256-SHA256

for your suggestions, https://erdem.apikit.net
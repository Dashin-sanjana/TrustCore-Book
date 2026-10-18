# ADR 0003: Stable Auth.js Credentials with revocation records

Status: existing implementation preserved; adapter extensions require joint review. Owner: shared.

Use stable next-auth v4, bcrypt password verification, encrypted JWT cookies and absolute database revocation/expiry records. Membership is re-read on protected operations. RefreshSession is not a raw refresh-token API. Do not install a PrismaAdapter without the required reviewed OAuth/account/session schema. Tradeoff: custom revocation lookup on each protected request; credentials recovery/verification remain pending.

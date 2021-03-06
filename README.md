# GitInsights

## Contributors

* **Bryan Curchod** - *Frontend* - [BryCur](https://github.com/BryCur)
* **Daniel Gonzalez Lopez** - *Backend* - [Angorance](https://github.com/Angorance)
* **Héléna Reymond** - *Backend* - [LNAline](https://github.com/LNAline)

For the frontend, we decided to use Angular 6 (JavaScript framework using TypeScript) to have a structured web app with Material Design.
For the backend, we used Express (Javascript framework using NodeJS) to build a REST Api.

## What's for?

Our application is for giving an **insight** about GitHub accounts and their usage. Hence our application shows some statistics of the authenticated user and analyse his past commits / issues to give some tips on how to be a better GitHuber (or dev).

### What can you find

First of all, in the statistics section, you will find your favorite languages, the coded lines for the last 100 commits, the number of commits you've done so far, some stats about your assigned issues and about your repositories too.

In a second time, in the tips section, you will find an analysis of your 100 last commits (mostly to analyse the length of your commit messages and the changes done), one of your languages (too much, maybe not enough?) and one about the time you take to resolve some issues.

### Tips

The tips you get are based on our experience and need to be improved over time with your feedback and (maybe one day?) Machine Learning (keeping data in a database to be analysed). Plus you have to keep in mind the tips are for the majority of devs, some of them won't be suitable for extreme projects and some special conditions.

One more thing about the tips are the scores. Each section analysed is given a score (with color decoration). This way it's more *obvious* if the tip is good or bad, even if our tips are funny and quite understandable :D

## How to use this locally

Don't forget to do an `npm install` for both frontend and backend.

### Register a new OAuth application
Go on your Github account and register a new OAuth app for your local usage:
```
Homepage URL : http://localhost:4200/home
Authorization callback URL : http://localhost:4200/stats
```

### Configure the backend
In the file `.env` add these lines and replace `xyz` by the data of the OAuth app you just created:
```
CLIENT_ID=xyz
CLIENT_SECRET=xyz
```

Open the backend folder in Visual Code and run it with the terminal:
```
npm run dev
```

### Configure the frontend
There is Two files to modify to use GitInsights in local : 
 - /front-end/GitInsights/src/app/btn-login/btn-login.component.ts : line 13 - you have to change the client ID
 ```
 clientId = 'yourClientID';
 ```
 - /front-end/GitInsights/src/app/stat-page/stat-page.component.ts : line 69 - change the target URL
 ```
 // server URL used
  _srvAddress = 'http://localhost:3000';
 ```
#### Running the live server 
In the folder `front-end\GitInsights` run the command
```cmd
npm install
```
N.B. : you might get an `unexpected string` error, if that's the case, delete the package-lock.json file and retry

When it's done you'll have to install the Angular CLI in order to run the live server : 
```cmd
npm install -g @angular/cli
ng serve --open
```
This will run the front-end on localhost:4200 and automatically open a new tab in your browser.

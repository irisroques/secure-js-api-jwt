const jsonfile = require('jsonfile');
const users = './database/users.json';
const inventory = './database/books.json';
const Constants = require('./constants');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


getUserByUsername = async function getUserDetails(userName) {
    const allUsers = await jsonfile.readFile(users);
    const filteredUserArray = allUsers.filter(user => (user.username === userName));
    return filteredUserArray.length === 0 ? {} : filteredUserArray[0];
};

const generateToken = (username, role) => {
    const payload = {data: username};
    const options = {
        algorithm: process.env.ALGORITHM,
        expiresIn: process.env.EXPIRY,
        issuer: process.env.ISSUER,
        audience: role === "admin" ? Constants.JWT_OPTIONS.ADMIN_AUDIENCE : Constants.JWT_OPTIONS.MEMBER_AUDIENCE,
        subject: username
    };
    return jwt.sign(payload, process.env.SECRET, options);
};

const getUsernameFromToken = (token) => jwt.decode(token)['sub'];

exports.getFavoriteBooksForUser = async function (token) {
    const username = getUsernameFromToken(token);
    const user = await getUserByUsername(username);
    const favoriteBookIds = user['favorite'];
    const allBooks = await jsonfile.readFile(inventory);
    const favoriteBooks = [];
    favoriteBookIds.map(id => favoriteBooks.push(allBooks.filter(book => id === book.id)[0]));
    return favoriteBooks;
};

exports.verifyToken = (req, res, next) => {
    if (!req.cookies.token) res.status(401).send({message: "Not Authorized to access data"});
    else {
        const token = req.cookies.token;
        jwt.verify(token, process.env.SECRET, function (err, decode) {
            if (err) res.status(401).send({message: "Please login again! Your session has expired"});
            else next();
        })
    }
};

exports.isAPIAccessAllowed = (token, apiName) => {
    const decodedToken = jwt.decode(token);
    return (decodedToken['aud'].includes(apiName));
};


exports.getAllUsers = async function () {
    const allUsers = await jsonfile.readFile(users);
    let updatedUsers = [];
    allUsers.map(user => {
        updatedUsers.push({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        })
    });
    return updatedUsers;
};

exports.getAllBooks = async function () {
    return await jsonfile.readFile(inventory);
};

exports.addBook = async function (book) {
    const allBooks = await jsonfile.readFile(inventory);
    allBooks.push(book);
    return await jsonfile.writeFile(inventory, allBooks);
};

exports.constructTokenResponse = async function (token, userName) {
    let name = userName || getUsernameFromToken(token);
    const user = await getUserByUsername(name);
    return  generateToken(user.username, user.role)
};

exports.isCredentialValid = async function (username, password) {
    const user = await getUserByUsername(username);
    if (user) {
        return bcrypt.compare(password, user.key)
            .then(result => result)
    } else return false;
};


"use strict";

const Hapi = require("hapi");
const Path = require("path");
const Bcrypt = require("bcrypt");
const fs = require("fs");
const Joi = require("joi");
const uuidv4 = require("uuid/v4");
const db = require("./database").db;
const Users = require("./models/user");

const server = Hapi.server({
    host: "localhost",
    port: 3000,
    routes: {
        files: {
            relativeTo: Path.join(__dirname, "public")
        }
    }
});

// GET ALL

server.route({
    method: "GET",
    path: "/{page?}",
    handler: async (request, h) => {

        const perPage = 10;
        const page = request.params.page ? encodeURIComponent(request.params.page) : 1;
        const totalUsers = await Users.count();
        const users = await Users.find({}).sort({$natural: -1}).skip((perPage * page) - perPage).limit(perPage);
        return h.view("index", { users: users, current: page, pages: Math.ceil(totalUsers / perPage) });
    }
});

// GET ONE BY ID

server.route({
    method: "GET",
    path: "/user/{_id}",
    handler: async (request, h) => {
        const id = request.params._id;
        const user = await Users.findById(id);

        return h.view("detail", { user: user });
    }
});

// ADD NEW

server.route({
    method: "POST",
    path: "/",
    config: {
        handler: async (request, h) => {
            // write file
            const fileName = uuidv4() + "-" + request.payload.file.hapi.filename;

            const filePath = Path.join(__dirname, "public/uploads", fileName);

            const data = request.payload.file._data;

            fs.openSync(filePath, "w+");
            fs.writeFileSync(filePath, data);

            const fileExt = fileName.split('.').pop();

            // convert to base64
            const bitmap = fs.readFileSync(filePath);

            var image_base64 = new Buffer(bitmap).toString("base64");
        
            image_base64 = `data:image/${fileExt};base64,${image_base64}`;

            const user = new Users({
                name: request.payload.name,
                age: request.payload.age,
                file: image_base64,
                createAt: Date.now()
            });

            await user.save(function(error, user) {
                if (error) throw error;
            });

            return h.redirect("/");
        },
        payload: {
            maxBytes: 10 * 1024 * 1024,
            output: "stream",
            parse: true
        }
    }
});

// UPDATE

server.route({
    method: "GET",
    path: "/update/{_id}",
    handler: async (request, h) => {
        const id = request.params._id;
        const user = await Users.findById(id);

        return h.view("update", { user: user });
    }
});

server.route({
    method: "POST",
    path: "/update/{_id}",
    handler: async (request, h) => {
        await Users.findByIdAndUpdate(request.params._id, {
            name: request.payload.name,
            age: request.payload.age,
            updateAt: Date.now()
        });

        return h.redirect("/");
    }
});

// DELETE ONE

server.route({
    method: "POST",
    path: "/remove/{_id}",
    handler: async (request, h) => {
        const id = request.params._id;

        await Users.findByIdAndRemove(id);

        return h.redirect("/");
    }
});

// DELETE ALL

server.route({
    method: "POST",
    path: "/remove",
    handler: async (request, h) => {
        await Users.remove({});

        return h.redirect("/");
    }
});

// SEARCH

server.route({
    method: "POST",
    path: "/search",
    handler: async (request, h) => {

        const query = request.payload.name;
        
        const users = await Users.find({
            $text: {$search: query}
        });

        console.log(users);

        return h.view("search", {query: query, users: users});
    }
});

const init = async () => {
    await server.register([
        require("inert"),
        require("vision")
    ]);

    server.views({
        engines: {
            html: require("ejs")
        },
        relativeTo: __dirname,
        path: "views"
    });

    server.route({
        method: "*",
        path: "/{any*}",
        handler: (request, h) => {
            return h.response("The page was not found").code(404);
        }
    });

    await server.start();

    console.log(`Server is running at ${server.info.uri}`);
};

process.on("unhandledRejection", err => {
    console.log(err);
    process.exit(1);
});

init();

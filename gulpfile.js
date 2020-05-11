const fs = require("fs");

function typeDefs(cb) {
  // Find schema files
  // return src("build/**/*.graphql").pipe(dest("output/"));

  const files = ["./build/schema.graphql", "./build/generated/prisma.graphql"];

  const fileContent = fs.readFileSync("path/to/file.something", "utf8");
  const typeDefs = fs.readFileSync("./schema.graphql", { encoding: "utf-8" });

  return gulp
    .src(files)
    .pipe(
      fs.readFile("path/to/file.something", "utf-8", function(err, _data) {
        // Wrap contents of file with:

        `
        const { gql } = require('apollo-server-express');

        module.exports = gql\`${_data}\`;
        `;

        // Output as .js
      })
    )
    .pipe(
      through2.obj(function(file, _, cb) {
        if (file.isBuffer()) {
          const code = uglify.minify(file.contents.toString());
          file.contents = Buffer.from(code.code);
        }
        cb(null, file);
      })
    )
    .pipe(gulp.dest("destination/path"));

  cb();
}

exports.default = typeDefs;

const fetch = require("node-fetch");
const { Buffer } = require("buffer");
const e = require("express");
const { getMonth, getYear } = require("date-fns");
const { timezoneOffsetInMs } = require("../config");

const getDocsAuthorization = async () => {
  const clientIdAndSecret = `${process.env.BACKBLAZE_DOCS_KEY_ID}:${
    process.env.BACKBLAZE_DOCS_APP_KEY
  }`;
  const base64 = Buffer.from(clientIdAndSecret).toString("base64");

  try {
    const authResp = await fetch(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {
        headers: {
          Authorization: `Basic ${base64}`
        }
      }
    );

    const authJson = await authResp.json();
    const { authorizationToken, apiUrl, downloadUrl, allowed } = authJson;

    return {
      authorizationToken,
      apiUrl,
      downloadUrl,
      bucketId: allowed.bucketId
    };
  } catch (e) {
    console.error(e);
    throw new Error("Unable to obtain authorization on docs service");
  }
};

const getFiles = async (apiUrl, authToken, bucketId, downloadUrl, prefix) => {
  const body = {
    bucketId,
    prefix
  };

  try {
    const listResp = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
      method: "POST",
      headers: { Authorization: authToken },
      body: JSON.stringify(body)
    });

    const listJson = await listResp.json();
    const { files } = listJson;

    return files
      .map(file => {
        const name = removePrefix(file.fileName, prefix);

        return {
          date: getFileDate(name),
          name: getFileName(name),
          link: getDownloadLink(downloadUrl, file.fileId)
        };
      })
      .sort((a, b) => {
        if (a.date > b.date) {
          return -1;
        }
        if (a.date < b.date) {
          return 1;
        }
        return 0;
      });
  } catch (e) {
    console.error(e);
    throw new Error("Unable to retrieve file names from docs service");
  }
};

const removePrefix = (fileName, prefix) => fileName.replace(prefix, "");

const getFileName = fileName => {
  // ex: 2017-08-01_File-Name
  const [date, snakeName] = fileName.split("_");

  return snakeName
    .split("-")
    .map(word => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
};

const getFileDate = fileName => {
  // ex: 2017-08-01_File-Name
  const [date] = fileName.split("_");
  const newDate = new Date(date);
  // Adjusted for GMT
  newDate.setTime(newDate.getTime() + timezoneOffsetInMs);

  return newDate;
};

const getDownloadLink = (urlPrefix, fileId) =>
  `${urlPrefix}/b2api/v2/b2_download_file_by_id?fileId=${fileId}`;

const getSingleFile = async prefix => {
  try {
    const {
      authorizationToken,
      apiUrl,
      downloadUrl,
      bucketId
    } = await getDocsAuthorization();

    const [file] = await getFiles(
      apiUrl,
      authorizationToken,
      bucketId,
      downloadUrl,
      prefix
    );

    return file;
  } catch (e) {
    console.error(e);
    throw new Error("Unable to retrieve file from docs service");
  }
};

const getAllFiles = async prefix => {
  try {
    const {
      authorizationToken,
      apiUrl,
      downloadUrl,
      bucketId
    } = await getDocsAuthorization();

    return getFiles(apiUrl, authorizationToken, bucketId, downloadUrl, prefix);
  } catch (e) {
    console.error(e);
    throw new Error("Unable to retrieve files from docs service");
  }
};

const detailDocs = (docs, label) =>
  docs.map(doc => {
    const year = getYear(doc.date).toString();
    const month = getMonth(doc.date).toString();

    return {
      ...doc,
      label,
      year,
      month
    };
  });

const zipDocsTogether = (minutes, newsletters) =>
  [...minutes, ...newsletters].reduce((acc, { year, month, label, ...doc }) => {
    // Check year and archives
    if (acc[year] && acc[year]) {
      // Check month
      if (acc[year][month]) {
        // Add
        acc[year][month][label] = doc;
      } else {
        // Create month, add docs
        acc[year][month] = {
          [label]: doc
        };
      }
    } else {
      // Create year, month, add docs
      acc[year] = {
        [month]: {
          [label]: doc
        }
      };
    }

    return acc;
  }, {});

const formatAndSortDocs = archives =>
  Object.entries(archives)
    .map(([year, monthlyArchives]) => {
      // Format and sort by month
      const results = Object.entries(monthlyArchives)
        .map(([month, docs]) => {
          return {
            month,
            ...docs
          };
        })
        .sort((a, b) => (+a.month > +b.month ? 1 : -1));

      return {
        year: year,
        monthlyArchives: results
      };
    })
    .sort((a, b) => (+a.year < +b.year ? 1 : -1));

const formatArchives = (minutes, newsletters) => {
  const minutesFiltered = detailDocs(minutes, "meetingMinutes");
  const newslettersFiltered = detailDocs(newsletters, "newsletter");

  const archivesFiltered = zipDocsTogether(
    minutesFiltered,
    newslettersFiltered
  );

  const yearlyArchives = formatAndSortDocs(archivesFiltered);

  return yearlyArchives;
};

module.exports = {
  getSingleFile,
  getAllFiles,
  formatArchives
};

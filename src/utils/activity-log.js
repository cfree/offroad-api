//   EVENT_ATTENDED                     TRANSACTIONAL
//   RUN_LED                           TRANSACTIONAL

//   EVENT_REVIEW_SUBMITTED             TODO
//   RUN_REPORT_SUBMITTED               TODO
//   GALLERY_PHOTO_SUBMITTED            TODO
//   GALLERY_PHOTOS_SUBMITTED           TODO
//   #COMMENTED                         TODO

module.exports.newProfilePhoto = ({ username, userId }) => ({
  time: new Date(),
  message: `Added a new profile photo`,
  messageCode: "PROFILE_PHOTO_SUBMITTED",
  link: `/profile/${username}`,
  user: {
    connect: {
      id: userId
    }
  }
});

module.exports.newRigbookPhoto = ({ username, userId }) => ({
  time: new Date(),
  message: `Added a new rigbook photo`,
  messageCode: "RIGBOOK_PHOTO_SUBMITTED",
  link: `/profile/${username}`,
  user: {
    connect: {
      id: userId
    }
  }
});

module.exports.joined = ({ joined }) => ({
  time: new Date(joined).toISOString(),
  message: "Joined",
  messageCode: "JOINED"
});

module.exports.runLed = ({ eventTitle, eventId, userId }) => ({
  time: new Date(),
  message: `Led ${eventTitle}`,
  messageCode: "RUN_LED",
  link: `/event/${eventId}`,
  user: {
    connect: {
      id: userId
    }
  }
});

const { startOfDay, endOfYear, startOfYear } = require("date-fns");
const ical = require("ical-generator");

const db = require("../db");

const MIN_DAYS = 1;
const MAX_DAYS = 10;

const getUpcoming = async (req, res) => {
  // allow from public site, override global cors settings
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://4-playersofcolorado.org"
  );
  const { count } = req.params;
  const numberCount = Number(count);

  try {
    const events = await db.query.events(
      {
        where: {
          AND: [
            { startTime_gte: startOfDay(new Date()).toISOString() },
            { endTime_lt: endOfYear(new Date()).toISOString() }
          ]
        },
        orderBy: "startTime_ASC",
        first:
          numberCount >= MIN_DAYS && numberCount < MAX_DAYS
            ? numberCount
            : MAX_DAYS
      },
      "{ id title startTime trailDifficulty }"
    );

    res.send(events);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.toString());
  }
};

const getIcal = async (req, res) => {
  // allow from all origins, override global cors settings
  res.setHeader("Access-Control-Allow-Origin", "*");
  const calendar = ical({ name: "4-Players", ttl: 3600 });

  try {
    const events = await db.query.events(
      {
        where: {
          startTime_gte: startOfYear(new Date()).toISOString()
        },
        orderBy: "startTime_ASC"
      },
      "{ id createdAt updatedAt title type startTime endTime trailDifficulty }"
    );

    // Format
    events.forEach(event => {
      const url = `https://members.4-playersofcolorado.org/event/${event.id}`;

      calendar.createEvent({
        id: event.id,
        uid: event.id,
        created: new Date(event.createdAt),
        lastModified: new Date(event.updatedAt),
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        summary: event.title,
        category: [event.type],
        description: url,
        url
      });
    });

    return calendar.serve(res);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.toString());
  }
};

module.exports = {
  getUpcoming,
  getIcal
};

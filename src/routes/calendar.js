const { startOfDay, endOfYear } = require("date-fns");
const ical = require("ical-generator");

const db = require("../db");

const getUpcoming = async (req, res) => {
  // allow from public site, override global cors settings
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://4-playersofcolorado.org"
  );
  const { count } = req.params;

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
        first: Number(count) || 10
      },
      "{ id title startTime }"
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
  const calendar = ical({ name: "4-Players" });

  try {
    const events = await db.query.events(
      { orderBy: "startTime_ASC" },
      "{ id title startTime }"
    );

    // Format
    events.forEach(event => {
      calendar.createEvent({
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        // description: ``,
        // location: 'my room',
        url: `https://members.4-playersofcolorado.org/event/${event.id}`
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

const { startOfDay, endOfYear } = require("date-fns");

const db = require("../db");

const getUpcoming = async (req, res) => {
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

module.exports = {
  getUpcoming
};

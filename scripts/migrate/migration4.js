const cuid = require("cuid");

const { mysql, postgres } = require("./db");
const {
  readJsonFile,
  getSlug,
  getRsvpMember,
  getNewUserId,
  mapPersonnelToUser,
  getTime,
  getRsvpStatus,
  getTrailDescription,
  getTrailAddress,
  getTrailName,
  getEventTrailDifficulty,
  getEventDesription,
  getEventTitle
} = require("./utils");

/**
 * Migrate events, rsvps, trails
 *
 * @desc Move old WordPress MySQL database to new app Postgres database
 *
 * Must run migration1 and migration3 script first to generate
 * users.json, rsvps.json, events.json, trails.json
 *
 * Assumes data in users.json, rsvps.json, events.json, and trails.json
 * has been massaged
 */

const fn = async () => {
  try {
    const usersMap = readJsonFile("/generated/users.json");
    const rsvpsMap = readJsonFile("/generated/rsvps.json");
    const eventsMap = readJsonFile("/generated/events.json");
    const trailsMap = readJsonFile("/generated/trails.json");

    // TRAILS

    // Create old-to-new venue IDs map
    let trailsPivot = {};
    const trailsDoneToDate = [];

    // Insert venues/trails
    await Promise.all(
      trailsMap.map(async trail => {
        const slug = getSlug(trail.name);

        if (trailsDoneToDate.includes(slug)) {
          return Promise.resolve();
        }

        trailsDoneToDate.push(slug);

        const newId = cuid();

        trailsPivot = {
          ...trailsPivot,
          [trail.id]: newId
        };

        return postgres("Trail").insert(
          {
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            slug,
            name: getTrailName(trail.name),
            description: getTrailDescription(trail.meta.description),
            address: getTrailAddress([
              trail.address,
              trail.city,
              trail.state,
              trail.zip
            ]),
            trailheadCoords: trail.coords || null
          },
          ["id"]
        );
      })
    );

    console.log("Trails inserted");

    // EVENTS

    // Retrieve event personnel
    const retrievedPersonnel = await mysql
      .select("id", "name")
      .from("events_personnel");

    // @massage: events end time
    // @massage: events address
    // @massage: trail difficulty

    // Create old-to-new event IDs map
    let eventsPivot = {};

    // Insert events
    await Promise.all(
      eventsMap.map(async event => {
        const newId = cuid();

        eventsPivot = {
          ...eventsPivot,
          [event.ID]: newId
        };

        return postgres("Event").insert(
          {
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            type: event.category,
            title: getEventTitle(event.event_name),
            description: getEventDesription(event.event_desc),
            startTime: getTime(event.start_date, event.start_time),
            endTime: getTime(event.end_date, event.end_time),
            address: event.address || null,
            trailDifficulty: getEventTrailDifficulty(
              event.meta.trail_difficulty
            ),
            rallyAddress: event.meta.rally_place || null,
            membersOnly: event.member_only,
            host: mapPersonnelToUser(
              usersMap,
              retrievedPersonnel,
              event.person_id
            ),
            creator: getNewUserId(usersMap, 24),
            maxRigs:
              event.reg_limit === 999999 || event.reg_limit === 99999
                ? -1
                : event.reg_limit
          },
          ["id"]
        );
      })
    );

    console.log("Events inserted", eventsMap.length);

    // RSVPS

    let rsvpsPivot = {};

    // Insert RSVPs w/ new IDs for events, users
    await Promise.all(
      rsvpsMap.map(async rsvp => {
        const newId = cuid();

        rsvpsPivot = {
          ...rsvpsPivot,
          [rsvp.ID]: newId
        };

        const member = getRsvpMember(usersMap, rsvp.user_id);

        if (!rsvp.user_id || !member) {
          return Promise.resolve();
        }

        return postgres("RSVP").insert(
          {
            id: newId,
            createdAt: rsvp.date,
            updatedAt: rsvp.date,
            status: getRsvpStatus(rsvp.payment_status),
            event: eventsPivot[rsvp.event_id],
            member,
            guestCount: 0,
            isRider: rsvp.is_primary === 0
          },
          ["id"]
        );
      })
    );

    console.log("RSVPs inserted");

    // CLEANUP

    // Connect events to trails: _EventTrail
    // A: Event, B: Trail
    await Promise.all(
      eventsMap.map(async event => {
        if (!event.venue_id || !trailsPivot[event.venue_id]) {
          // bail
          return;
        }

        const trailId = trailsPivot[event.venue_id];

        return postgres("_EventTrail").insert({
          A: eventsPivot[event.ID],
          B: trailId
        });
      })
    );

    // Connect trails to users: _TrailVisitor
    // Empty, not used?
    // A: _, B: _

    // Connect users to rsvp: _MembersRSVP
    // Empty, not used?
    // A: _, B: _

    console.log("Cleanup completed");

    // STOP. `npm run migration:5`
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
};

return fn();

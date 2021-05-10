const { unserialize } = require("php-serialize");

const { mysql } = require("./db");
const {
  createJsonFile,
  getEventCategory,
  getEventStatus,
  getPersonId
} = require("./utils");

/**
 * Migrate events, categories, rsvps, trails
 *
 * @desc Move old WordPress MySQL database to new app Postgres database
 *
 * Must run migration1 script first to generate users.json
 *
 * Generates events.json, rsvps.json and trails.json migration files
 *
 * Assumes data in users.json has been massaged
 */

const fn = async () => {
  try {
    // EVENTS

    // @todo: duplicates?

    // Retrieve old events
    const retrievedEvents = await mysql
      .select(
        "e.ID",
        "e.event_code",
        "e.event_name",
        "e.event_desc",
        "e.start_date",
        "e.end_date",
        "e.reg_limit",
        "e.is_active",
        "e.event_status",
        "e.member_only",
        "e.event_meta",
        "e.category_id",
        "vr.venue_id",
        mysql.raw("GROUP_CONCAT(pe.person_id) as person_id"),
        "ti.start_time",
        "ti.end_time"
      )
      .from("events_detail AS e")
      .leftJoin("events_venue_rel AS vr", "e.ID", "=", "vr.event_id")
      .leftJoin("events_personnel_rel AS pe", "e.ID", "=", "pe.event_id")
      .leftJoin("events_start_end AS ti", "ti.id", builder =>
        builder
          .select("id")
          .from("events_start_end")
          .where("events_start_end.event_id", "=", mysql.ref("e.ID"))
          .limit(1)
      )
      .where("e.event_status", "A")
      .andWhere("e.is_active", "Y")
      .groupBy("e.ID");

    /**
     * Unserialized format:
     *
     * default_payment_status
     * venue_id
     * additional_attendee_reg_info
     * add_attendee_question_groups
     * date_submitted
     * event_hashtag
     * event_format
     * event_livestreamed
     * rally_time
     * rally_place
     * trail_difficulty
     */
    const unserializedEvents = retrievedEvents.map(event => {
      const { event_meta, ...rest } = event;
      const newEventMeta = unserialize(event_meta);

      return {
        ...rest,
        meta: newEventMeta
      };
    });

    // Retrieve event categories
    const retrievedCategories = await mysql
      .select("id", "category_name")
      .from("events_category_detail");

    // Re-map misc
    const remappedEvents = unserializedEvents.map(event => {
      const {
        person_id,
        category_id,
        reg_limit,
        is_active,
        event_status,
        member_only,
        ...rest
      } = event;

      // Get array of category IDs
      const categoryIdList = category_id
        ? category_id.split(",").map(cat => parseInt(cat.trim(), 10))
        : [];
      // Map category IDs to names
      const categoryNames = categoryIdList.map(id => {
        const foundCategory = retrievedCategories.find(cat => cat.id === id);
        return getEventCategory(foundCategory.category_name);
      });

      return {
        ...rest,
        person_id: getPersonId(person_id),
        reg_limit: parseInt(reg_limit, 10),
        is_active: is_active === "Y",
        event_status: getEventStatus(event_status),
        member_only: member_only === "Y",
        category: categoryNames[0] // There can only be one
      };
    });

    // Generate events migration json file
    createJsonFile("events", remappedEvents);

    // TRAILS

    // Retrieve venues/trails
    const retrievedVenues = await mysql
      .select(
        "id",
        "name",
        "address",
        "city",
        "state",
        "zip",
        "country",
        "meta"
      )
      .from("events_venue");

    /**
     * Unserialized format:
     *
     * contact
     * phone
     * twitter
     * image
     * website
     * description
     */
    const unserializedVenues = retrievedVenues.map(event => {
      const { meta, ...rest } = event;
      const newTrailMeta = unserialize(meta);

      return {
        ...rest,
        meta: newTrailMeta
      };
    });

    // Generate trails migration json file
    createJsonFile("trails", unserializedVenues);

    // RSVPs

    // @todo: missing `is_primary: 0` entries

    // Retrieve rsvps
    const retrievedRsvps = await mysql
      .select(
        "e.id",
        "e.event_id",
        "e.is_primary",
        "e.email",
        "e.date",
        "e.price_option",
        "e.orig_price",
        "e.payment_status",
        // "e.transaction_details", // serialized
        "m.ID AS user_id"
      )
      .from("events_attendee AS e")
      .join("users AS m", "e.email", "=", "m.user_email");

    /**
     * Unserialized format:
     *
     * mc_gross
     * protection_eligibility
     * address_status
     * item_number1
     * payer_id
     * address_street
     * payment_date
     * charset
     * address_zip
     * first_name
     * mc_fee
     * address_country_code
     * address_name
     * notify_version
     * custom
     * payer_status
     * business
     * address_country
     * num_cart_items
     * address_city
     * verify_sign
     * payer_email
     * txn_id
     * payment_type
     * last_name
     * item_name1
     * address_state
     * receiver_email
     * payment_fee
     * quantity1
     * receiver_id
     * txn_type
     * mc_gross_1
     * mc_currency
     * resident_country
     * transaction_subject
     * payment_gross
     * ipn_track_id
     */
    const unserializedRsvps = retrievedRsvps.map(event => {
      const { transaction_details, ...rest } = event;

      if (!transaction_details) {
        return rest;
      }

      const newRsvpMeta = unserialize(transaction_details);

      console.log("meta", newRsvpMeta);

      return {
        ...rest,
        meta: newRsvpMeta
      };
    });

    // Generate rsvps migration json file
    createJsonFile("rsvps", unserializedRsvps);

    // STOP. `npm run migration:4`
    return Promise.resolve();
  } catch (e) {
    Promise.reject(e);
  }
};

return fn();

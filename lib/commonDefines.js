'use strict';

const STATES = {
    ON: true,
    OFF: false
}

/**
* Eigene textuelle Bezeichnungen für "alias"-Struktur
*/
const BUTTON_EVENTS_NAMES = {
    SINGLE_PRESS: "BUTTON_IS_SINGLE_PRESS",
    DOUBLE_PRESS: "BUTTON_IS_DOUBLE_PRESS",
    HOLD: "BUTTON_IS_HOLD",
};

const DAYTIMES = {
    NIGHT: "Nacht",
    DAWN: "Morgendämmerung",
    SUNRISE: "Sonnenaufgang",
    MORNING: "Morgen",
    FORENOON: "Vormittag",
    NOON: "Mittag",
    AFTERNOON: "Nachmittag",
    EVENING: "Abend",
    SUNSET: "Sonnenuntergang",
    DUSK: "Abenddämmerung"
}

const ROOMS = {
    WOHNZIMMER: "Wohnzimmer",
    SCHLAFZIMMER: "Schlafzimmer",
    ZIMMER_DOMI: "Zimmer Domi",
    KUECHE: "Küche",
    BAD: "Bad",
    GANG: "Gang", // Eingangsbereich
    FLUR: "Flur", // zentraler Raum
    BALKON: "Balkon",
    COMPLETE: "Alle Räume",
    UNDEF: "Unbekannter Raum"
};

const ROOMS_EN = {
    WOHNZIMMER: "LivingRoom",
    SCHLAFZIMMER: "BedRoom",
    ZIMMER_DOMI: "RoomDomi",
    KUECHE: "Kitchen",
    BAD: "BathRoom",
    GANG: "Hallway", // Eingangsbereich
    FLUR: "Corridor", // zentraler Raum
    BALKON: "Balcony"
};

const ROOMS_WITH_DOOR = [ROOMS.BALKON];
const ROOMS_WITH_WINDOW = [ROOMS.BAD, ROOMS.KUECHE, ROOMS.SCHLAFZIMMER, ROOMS.WOHNZIMMER, ROOMS.ZIMMER_DOMI];
const ROOMS_WITH_MOTION_SENSOR = [ROOMS.GANG, ROOMS.KUECHE]; // includes motion and presence sensors
const ROOMS_WITH_AIR_CONDITIONING = [ROOMS.WOHNZIMMER, ROOMS.ZIMMER_DOMI];
const ROOMS_WITH_AIR_CONDITIONING_EN = [ROOMS_EN.WOHNZIMMER, ROOMS_EN.ZIMMER_DOMI];
const ROOMS_WITH_AIR_PURIFIER = [ROOMS.ZIMMER_DOMI, ROOMS.SCHLAFZIMMER, ROOMS.WOHNZIMMER];
const ROOMS_WITH_THERMOSTAT = [ROOMS.BAD, ROOMS.KUECHE, ROOMS.SCHLAFZIMMER, ROOMS.WOHNZIMMER, ROOMS.ZIMMER_DOMI, ROOMS.FLUR];
const ROOMS_WITH_THERMOSTAT_EN = [ROOMS_EN.BAD, ROOMS_EN.KUECHE, ROOMS_EN.SCHLAFZIMMER, ROOMS_EN.WOHNZIMMER, ROOMS_EN.ZIMMER_DOMI, ROOMS_EN.FLUR];
const ROOMS_WITH_LIGHTING = [ROOMS.KUECHE, ROOMS.SCHLAFZIMMER, ROOMS.WOHNZIMMER, ROOMS.ZIMMER_DOMI, ROOMS.FLUR, ROOMS.GANG];

const idUserDataPrefix = "0_userdata.0.";
const idAliasPrefix = "alias.0.";

module.exports = {
    STATES, BUTTON_EVENTS_NAMES, DAYTIMES, ROOMS, ROOMS_EN, ROOMS_WITH_DOOR, ROOMS_WITH_WINDOW, ROOMS_WITH_MOTION_SENSOR, ROOMS_WITH_AIR_CONDITIONING,
    ROOMS_WITH_AIR_CONDITIONING_EN, ROOMS_WITH_AIR_PURIFIER, ROOMS_WITH_THERMOSTAT, ROOMS_WITH_THERMOSTAT_EN, ROOMS_WITH_LIGHTING, idUserDataPrefix, idAliasPrefix
};
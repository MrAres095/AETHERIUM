"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBattery, chargeBattery, dischargeBattery, transferEnergy, transferWirelessHop, validateWirelessRoute } = require("../behavior_pack/scripts/energy_ledger.js");


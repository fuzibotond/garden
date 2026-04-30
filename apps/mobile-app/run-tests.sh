#!/bin/bash
cd "c:\\Users\\fuzib\\OneDrive\\Dokumentumok\\GitHub\\garden\\apps\\mobile-app"
npm test 2>&1 | grep -E "Tests:|Test Suites:|PASS|FAIL" | tail -50

# README_AI — P102 V1.2 Campus & Building Labels

Project ID: P102  
Name: Campus Spatial Knowledge Platform  
Motto: Every Search Leaves Knowledge Behind.

## Current baseline

V1.2 Campus & Building Labels is the current baseline. It preserves V1.1 behavior and adds centralized campus/building display labels in `js/p102-location-labels.js`.

## Important constraints

- Do not include real `jpg/` map files in update ZIPs unless explicitly requested.
- Do not overwrite `config.js`; provide only `config.sample.js`.
- `SpaceNo` is the university-wide unique identifier.
- Image paths are `jpg/{FloorMapPic}.jpg` and `jpg/{CampusMapPic}.jpg`.
- Search must be server-side against Supabase, not preloaded first 1000 rows.

## Core tables

- TblP102Space
- TblP102SpaceAlias
- TblP102SearchEvents
- TblP102SearchFailures
- TblP102SpaceViewEvents
- TblP102Feedback

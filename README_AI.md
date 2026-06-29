# README_AI — P102 V1.0 Stable

Project ID: P102  
Name: Campus Spatial Knowledge Platform  
Motto: Every Search Leaves Knowledge Behind.

## Current baseline

V1.0 Stable is the new baseline after the jpg migration and Database v2.0 design.

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

#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

# Current fork — iteration54 (supersedes old scope/status below)
# CURRENT TASK iteration61: user approved GitHubActions main relevantTV/CDNpath push
# plus workflow_dispatch, CloudflareSecrets setup guide. TEMPLATE ONLY; no credentials
# requested/chatted, NO GitHub release or Cloudflare production publication authorized here.
# Implemented: deploy-tv-cdn.yml SHA-pinnedcheckout/setupnode,Node22,classicYarnlockeddeps,
# strictCDNbuild/nofallback/noautoagepruning, persistent cumulative GitHubrelease history,
# SHA256+safetar validation, failclosed missingseedhistory, draftthenpublish checkpoint
# BEFOREatomicWranglerdeploy,mainHEADguard+serializedjobs,postlive version/hash/CORSchecks,
# manualdryrun defaulttrue no mutation/secretneeded. FreshCI no ephemeralcacheashistory.
# Need initial FULL previous-CDN backup importedastv-cdn-seed,2GitHubSecrets perguide.
# Existing fixed-pathjs/css requirebackwardscompatibility; hashpreservation notuniversalJScompat.
# MAIN checks: tsc+realCDNbuild55files+localvalidation+Wrangler4.136.2dryrun PASS (no upload).
# Lints JS+PythonPASS. iteration61:13Python+12Node=25testsPASS; addedtoeachworkflowrun.
# Officialrhysd/actionlint1.7.12 ARM64checksumverified+workflowlintPASS (mainfollowup).
# No GitHubjob/Cloudflareauthpublication/nativeTVtestexecuted; userSecrets+fullseedrequired.
# ScopeUIunchanged; noExpo/nativesmoke required. ExistingTVpackageworkflow untouched.
# LATEST iteration60 combined approval: fix TürkülerleTürkiye missing now-playing by
# comparing mobile+officialweb, finish Back/focus, add subtle carousel arrows5rows.
# Verified root metadata: raw url=listen.pls?sid22; API urlResolved=stream/22/; TVwas
# feedingPLS toRadiolise. Mobile usesnativeICY+REAL production /api/now-playing/id.
# ExternalAPI tested200flat {title,artist,station,genre}; localbackend endpoint returns
# fallbackgenre and is NOT used. TV getStationMetadata nowsharedbuildApiUrl /now-playing,
# normalizesflat/wrapper; useNowPlayingMetadata resolvedURL+initialREST+60secfallback,
# station-key cleanup/staleHTTPguard, no clear ontransientWSerror. Native untouched.
# Selftest publicpreview: TürkülerleTürkiye showed 'İzzet Altınmeşe - Senem' matching
# simultaneousproductionAPI. Similar rightarrow scroll +leftcuePASS, modalEscapePASS.
# Back iteration59 mainRCA: Search query-reset effect ran AFTER restore and resetindex0;
# DOM activecardwascorrect butpinkstatewrong. Firstqueryreset now skips restoredsnapshot.
# Modal CountrySelector nowowns navigation capture, consumesBacksinglehandler; ordinary
# chars continue bubbling. ActualSearchresult2 andGenreListcard10 returnstateID selftestsPASS.
# Added data-focused onSearchrecent/Genre/Favorites so tests don't confuse initialsidebar
# .tv-focused artifact or DOM focus with Reacthighlight. No timing rewrite basedonguess.
# Arrows sharedHorizontalScrollCues forRadioSimilar/Popular,DiscoverRecent/ForYou/Genres:
# 48px,.35idle,hoverpink,19headergap preserved,hideatboundary,noextraDpadstop,600pxstep.
# iteration60 PASS:41+5+14+17 sourceassertions; live title/APIparity; Searchidx2/Genreidx30/
# Favoritesidx34 sameID+highlight; arrows/boundaries;directroutes;modalkeyownership.
# Sole data-gap Searchrecentidx1 resolved MAINselftest20260922_001251:3realAPIstations
# seeded ONLYtestbrowserlocalhistory; remote10009 returnidx1sameID, thenRightidx2 PASS.
# Latest tiny CSS: suppress native white outline on programmaticallyrestoredcard so
# pink TV virtualfocus remains soleindicator. Sourcefiles reviewed, productionunmocked.
# Final CSS selftest20260922_001615: Search returnID+visualidx2, restored-card computed
# outlineStyle=none, nextArrowDown→idx3 PASS; final77assertions+tsc+build+lintPASS.
# CURRENT iteration59 request: RadioPlaying Back (TV461/10009/Android4, keyboard
# Escape/Backspace) returns original source with station-ID focus, search/filter/
# loaded pagination and scroll. User skipped followup so recommended defaults apply;
# direct entry returns Discover, playback behavior unchanged. Origin survives Next.
# Latest alignment request supersedes text-edge: country CAPSULE outer right border
# matches favorite outer right border. Test58 geometry passed3sizes,19gap,0.03pxdelta.
# Test58 found real direct hash-query404: installed Wouter navigate moves query BEFORE
# hash but matching doesn't strip raw hash query. main.tsx now canonicalizes startup +
# hashchange via normalizeHashQuery; RadioPlaying useSearch reacts same-route query updates.
# In progress pending test59: NavigationContext route-owned state+snapshot+scroll capture;
# Discover/GenreList pagination snapshots; Search query/result/recent restore; Favorites
# mouse and Dpad save source and restore byID; Back close modal first then source.
# NEW USER REQUEST (iteration56): Equalizer presets overlap sidebar (Settings under Vocal).
# User confirmed examine/fix shared TV/Desktop pages, preserve design, different viewports,
# pointer+D-pad/focus; excludes native Apple TV redesign. NOW requests working browser link;
# supplied verified /api/tv-app/#/discover-no-user and #/equalizer on current preview origin.
# iteration56–57 verified: TV layout constants, Equalizer left236/right74 safe pane,
# independent focus, D-pad navigation,44px range hitbox; shared Sidebar DOM focus; Favorites
# multirow scroll, dynamic safe scroll bottom above player for Discover/Genres/GenreList;
# scaled scroll delta in shared revealTvItem; long genre flex item minWidth; Settings
# right safe margin and wrapping title/description. Geometry5viewports + hit-tests/Dpad PASS.
# iteration57:35favorites browser-only fixture +deep-row scroll PASS; real currentStation
# miniplayer gap24 at stageBottom901/backdrop925 on4list pages PASS;5scale unitassertions PASS.
# External logo/CORS/icon-proxy errors remain source-side, existing fallback; no UI blocker.
# Favorites duplicateAPIbase removed via shared buildApiUrl. No auth/provider migration.
# User confirmed: fix iteration53 Desktop IAP/paywall, TV/Wear API issues, finish backend README;
# leave Apple TV visuals and architecture migration deferred. No mobile preview requested.
# iteration54: 14 backend PASS / 1 legacy SSE SKIP; 5 Node suites PASS, TV browser smoke PASS.
# iteration55: actual TS behavioral harness 41 assertions PASS; tightened live API 3/3 PASS.
# Equalizer keyboard/drag-up/reset PASS; deprecated slider warning gone.
# Boundary: direct GlobalPlayer onError retry event chain not executed; helpers validated.
# Minor compatibility fix: rotated standard EQ range replaces deprecated slider-vertical.
# External favicon 403 handled by existing fallback; documented, origin not controlled here.
# implemented=true, working=true (executed checks only), needs_retesting=false:
# - Paywall bridge TDZ/snapshot guard + valid DesktopPremium variant.
# - UpdateBanner union dependency; Equalizer missing Sidebar callback props.
# - Shared companion country normalizer + Wear country-name selectors, URI encoding,
#   empty/error station updates. No native compile claims.
# - Preview-only stream routing (Electron/AndroidTV no file:///api on playlist/retry),
#   final_url response alias and bounded direct playlist parsing preserving HLS.
# - test_tv_desktop_endpoints.py uses explicit TV_PREVIEW_BACKEND_URL, legacy SSE opt-in.
# - README_API_UPDATES.md created, README_API_DEVELOPER.md linked; sanitized live GET mapped.
# Testing: run all issue53 regression suites, new executable behavioral regressions,
# TV isolated tsc/build; backend helper tests on preview host ONLY; real readonly API
# country/popular/genre/subscription checks separately using memory/test_credentials.md.
# Never make real purchase/account mutations; no secrets in test artifacts/docs.
# Source review alone cannot validate native playback/StoreKit/Play Billing/device bridges.
# The handoff payload-type claim was inaccurate: Electron JSON serialization already present.

user_problem_statement: "Latest: prepare automatic GitHub main relevantTV/CDN changes plus manual workflow for existing Samsung/LG CloudflareCDN. Workflow/helpers/docs prepared and offline checks passed iteration61; no credentialed publication or GitHub release executed. User must add2GitHubSecrets and fulllegacyCDNseedarchive, then runjob. PreviousTVUI/metadata/Back improvements retained; nativeTV/runtime separate. Older task entries historical."
frontend:
  - task: "Android SoLoader native packaging mitigation"
    implemented: true
    working: NA
    file: "frontend/app.json; plugins/withAndroidBuildFix.js; android/gradle.properties"
    stuck_count: 0
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "Crash 1.0.69(91) libreactnative.so: nativeLibraryDir arm64 vs DirectApkSoSource x86_64; actual ABI/install cause unproven without APK/device. useLegacyPackaging true mitigation; keep all ABIs; bump versionCode92; removed obsolete dexOptions; preserve boot permission removal. Prebuild succeeded twice, not a native build."
  - task: "CarPlay cold start / scene generation / template lifecycle"
    implemented: true
    working: NA
    file: "frontend/plugins/withCarPlayScenes.js; plugins/ios/*.swift; src/services/carPlayService.ts; src/components/QuickActionsHandler.tsx"
    stuck_count: 0
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "Single retained main root via factory for CarPlay-first, real phone UIWindowScene attachment, native immediate loading root, forwarding URL/userActivity/shortcut, clean-prebuild scene source registration, app-wide newArchEnabled false (was inconsistent plist true). Missing megaradio URL scheme restored. Tab title/image moved into ListTemplate constructor config (previous assignments ignored); generation guards discard disconnect/reconnect stale fetches; replaced root listener cleanup. Verify actual native APIs via installed sources, cannot compile Swift here."
  - task: "Mobile nearby playback and common functional fixes"
    implemented: true
    working: NA
    file: "frontend/app/nearby-stations.tsx; src/components/StationCard.tsx; src/hooks/useWatchConnectivity.ts; src/services/carPlayImageCache.ts"
    stuck_count: 0
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "Nearby used undefined playerStore.play -> useAudioPlayer.playStation, zero coordinates accepted, refresh finally, native testIDs. StationCard large gradient undefined and play button inert fixed. Cache legacy FS API restored. Font duplicate keys removed in search/users/player/notifications. Watch unused hook repaired. No new APIs/mocks."
  - task: "Mobile web preview render"
    implemented: false
    working: false
    file: "frontend/app/_layout.tsx"
    stuck_count: 1
    priority: high
    needs_retesting: true
    status_history:
      - agent: main
        working: false
        comment: "Screenshot hangs at white Bundling... app/_layout.tsx despite bundle 200 (8.5MB,1s) and Watch/NativeCast/Onboarding logs. remoteLog CORS storm removed for web but NOT the primary root cause; 2 troubleshooter recommendations about sendLog were speculative. Need actual lazy route module/promise investigation. Do not modify protected metro/index main/env."
test_plan:
  current_focus: ["Iteration61 CDN automation25tests+nativeactionlint+dryrunPASS", "UserGitHubSecrets and fullseedarchive setup", "ActualGitHub/Cloudflare job and nativeTVacceptance pending"]
  test_all: false
  test_priority: high_first
agent_communication:
  - agent: main
    message: "Iteration61 report and4testfiles read.13Python+12NodetestsPASS, nowwiredworkflow. RealCDNbuild/typecheck/localvalidation/WranglerdryrunPASS, officialactionlint1.7.12ARM64checksum+workflowlintPASS. No actualpublication. TwoGitHubSecrets+publishedtv-cdn-seedFULLhistorybackuprequired; missinghistoryfailsclosed. SourcechangeslimitedCDNbuildhelpers/docs/workflow; appUI/native/protectedenvunchanged."
  - agent: main
    message: "Latest iteration60 report+test modifications read. Live metadata verified against same API response;77 sourceassertions PASS, deep ID restoration andcarousels PASS. Main closed the sole data availability gap using3realpublicstationrecords inisolatedbrowser recentlyPlayed only:idx1 remote10009 Back sameID thenRightidx2 PASS. No native/runtimeallplatformguarantee. Last frame refinement suppresses default browserwhiteoutline on restoredcard, notTVpinkstate. Root API README+PRD updated; outstanding upstreamfaviconnoise unchanged."
  - agent: main
    message: "Iteration56/57 reports and test file changes read. Primary overlap root cause fixed; screenshots visually rechecked. 5 viewport geometry + Dpad/hit-testing PASS;35favorites local-only fixture, real-station currentStation and4page24pxgap PASS. Readonly asset/link HTTP200. Shared Favorites API builder used; no auth change. Remaining external logo noise documented; source module size refactor not functional layout bug. User explicitly now asks for browser TV links. Native AppleTV visuals not expanded."
  - agent: main
    message: "Latest iteration54/55 complete: reports reviewed, test-file edits reviewed. 14 backend PASS/1 optional legacy SSE SKIP, 5 source suites PASS, 41 behavior assertions PASS, tighter 3 live checks PASS, TV UI smoke PASS. Native sandbox/device validation and external website/API tasks documented in root README_API_UPDATES.md. No real payments. Direct GlobalPlayer retry event-chain coverage remains optional; no all-platform runtime guarantee. User excludes mobile preview."
  - agent: main
    message: "Run test harnesses plus native config generation checks in isolated temp copy for CLEAN prebuild (do not destroy checked-in ios/watch targets). Modified JS/plugin lint passed. Existing tsc mobile errors remain in old/inactive cast store/GlobalAudioPlayer and some type declarations. See /tmp/megaradio-tsc-before.log and after.log. Credentials in memory/test_credentials.md, do not change accounts."
# Graph Report - src  (2026-11-05)

## Corpus Check
- Large corpus: 870 files · ~451,298 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4102 nodes · 13389 edges · 170 communities (138 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 205 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Privacy, Sharing & Devices
- 3D Notebook Book Rendering
- Handwriting Geometry Bounds
- Handwriting Cursor & Ink Options
- Notebook Collaboration Backend
- Bingo Ball Palette
- Local Room Backend Handler
- Page Canvas Drawing
- Profile Avatar & Achievements UI
- Listening Quiz
- Achievement Announcer & Art
- Export & Loading Components
- Onboarding & Notebook Spread Tests
- Agenda Progress & Pomodoro Controls
- Notebook 3D Model Math
- Bingo Winners & Room Config
- Handwriting Multi-Stroke
- Library Flashcards & Readers
- Agenda Reminders
- Cosmic Math Island Art
- Note Capture & Handwriting Draft
- Local Workspace Validation
- Handwriting Erase Tests
- Profile Social Backend
- Bingo Planet & Review
- Agenda Focus Week & Fields
- Notebook Scene Renderer
- App Navigation
- Handwriting Dash & Eraser
- Onboarding Configuration
- Handwriting Page Scene
- Focus Device & Pomodoro Notifications
- Language Switch & Error Boundary
- Handwriting Precision & Prediction
- Bingo & Room Handler Tests
- Animated Places & Math Arcade
- Rewards & Social Activity Cards
- Lesson Activity Bank
- Cloud State Codec
- Notebook & Library Preferences
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 150

## God Nodes (most connected - your core abstractions)
1. `uiText()` - 527 edges
2. `useLanguage()` - 316 edges
3. `HandwritingStudio()` - 107 edges
4. `NotebookScene` - 82 edges
5. `createInitialWorkspace()` - 51 edges
6. `getFirebaseAccountServices()` - 50 edges
7. `WorkspaceState` - 49 edges
8. `writeSyncedStorage()` - 47 edges
9. `LocalRoom()` - 42 edges
10. `loadWorkspace()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `cue()` --calls--> `createMathSound()`  [EXTRACTED]
  components/account-access-panel.tsx → data/math-sound.ts
- `COLORS` --calls--> `uiText()`  [EXTRACTED]
  components/agenda-color-palette.tsx → i18n/runtime.ts
- `upload()` --calls--> `uiText()`  [EXTRACTED]
  components/agenda-event-details.tsx → i18n/runtime.ts
- `NAVIGATION_SECTIONS` --calls--> `uiText()`  [EXTRACTED]
  components/app-navigation.tsx → i18n/runtime.ts
- `MOBILE_ITEMS` --calls--> `uiText()`  [EXTRACTED]
  components/app-navigation.tsx → i18n/runtime.ts

## Import Cycles
- None detected.

## Communities (170 total, 10 thin omitted)

### Community 0 - "Privacy, Sharing & Devices"
Cohesion: 0.04
Nodes (89): NotFoundView, ActivityPrivacy(), AgendaEventShare(), close(), prepare(), share(), FocusRose(), rosePath() (+81 more)

### Community 1 - "3D Notebook Book Rendering"
Cohesion: 0.05
Nodes (71): NotebookSpread3d(), NotebookSpread3dProps, PlacementResult, closeNotebook3d(), Closer, notebook3dCoverRect(), prefetchNotebook3d(), registerNotebook3dCloser() (+63 more)

### Community 2 - "Handwriting Geometry Bounds"
Cohesion: 0.06
Nodes (86): coordinateBounds(), importedImageBounds(), overlaps(), pageTextBounds(), pointInPolygon(), stickyBounds(), strokeBounds(), strokeInkBounds() (+78 more)

### Community 3 - "Handwriting Cursor & Ink Options"
Cohesion: 0.04
Nodes (57): CURSOR_COLORS, cursorColor(), DASH_CHOICES, HandwritingInkOptions(), HandwritingInkOptionsProps, OCR_WORKER_OPTIONS, PALM_GRACE_MS, PalmState (+49 more)

### Community 4 - "Notebook Collaboration Backend"
Cohesion: 0.05
Nodes (68): createAttempt(), authorizedParticipant(), save(), createNotebookCollabHandler(), hasImageSignature(), jsonResponse(), loadState(), NotebookCollabHandlerDependencies (+60 more)

### Community 5 - "Bingo Ball Palette"
Cohesion: 0.05
Nodes (58): colors, lights, paperBallStyle(), shades, BingoLatest(), PaperBallSkin(), PAPER_BALL_FACES, BingoParticipant() (+50 more)

### Community 6 - "Local Room Backend Handler"
Cohesion: 0.08
Nodes (65): createRoomAttempt(), requireHost(), savePresence(), saveRoom(), isSettingsPayload(), jsonResponse(), loadRoom(), LocalRoomHandlerDependencies (+57 more)

### Community 7 - "Page Canvas Drawing"
Cohesion: 0.06
Nodes (65): canvasPoint(), clearPageCanvas(), drawStroke(), pageContext(), readDraft(), strokeId(), renderPageScene(), pointerSamples() (+57 more)

### Community 8 - "Profile Avatar & Achievements UI"
Cohesion: 0.08
Nodes (47): ProfileChoices(), MathAchievements(), ProfileAvatarDialog(), close(), ProfileCoverArt(), ProfileCoverDialog(), close(), ProfileEditor() (+39 more)

### Community 9 - "Listening Quiz"
Cohesion: 0.05
Nodes (43): ListeningOnlineNotice(), ListeningOnlineNoticeProps, DIFFICULTY_LABELS, DifficultyFilter, ListeningQuiz(), restart(), selectDifficulty(), submit() (+35 more)

### Community 10 - "Achievement Announcer & Art"
Cohesion: 0.07
Nodes (43): AchievementAnnouncer(), mocks, audio, GeneralAchievementScene(), AchievementArt(), AchievementCollection(), changeFavorite(), choose() (+35 more)

### Community 11 - "Export & Loading Components"
Cohesion: 0.07
Nodes (31): exportPdf(), exportPng(), printPage(), HelenaLoading(), HelenaLoadingProps, LibraryLinks(), NoteFlashcardTools(), NotebookFileActions() (+23 more)

### Community 12 - "Onboarding & Notebook Spread Tests"
Cohesion: 0.09
Nodes (31): answers, fixture(), Artwork(), StudentFavoritesShelf(), workspaceWith(), saveWorkspace(), isNotebookFolder(), normalizeNotebookFavorites() (+23 more)

### Community 13 - "Agenda Progress & Pomodoro Controls"
Cohesion: 0.07
Nodes (31): AgendaIslandProgress(), BasicMathArtifact(), FocusPaperArrow(), PomodoroControls(), PracticeIslandCarousel(), FakeProps, PracticeSubjectTrail(), TrailEmblem() (+23 more)

### Community 14 - "Notebook 3D Model Math"
Cohesion: 0.10
Nodes (38): BendPoint, bendSheet(), BOOK, bookmarkDistance(), BookView, clamp(), DIVIDER, dividerCenterZ() (+30 more)

### Community 15 - "Bingo Winners & Room Config"
Cohesion: 0.08
Nodes (35): BingoWinners(), AUDIO_REPLAY_COOLDOWN_MS, countLabel(), DEFAULT_SETTINGS, HELENA_WORD_STEPS, MANUAL_LISTENING_SOURCE, ROOM_ACTIVITY_OPTIONS, TIME_STEPS (+27 more)

### Community 16 - "Handwriting Multi-Stroke"
Cohesion: 0.09
Nodes (42): combineWithRecentLines(), MAX_RECENT_LINES, pruneRecentLines(), RECENT_LINE_WINDOW_MS, RecentLine, sameStyle(), segmentOf(), seg() (+34 more)

### Community 17 - "Library Flashcards & Readers"
Cohesion: 0.09
Nodes (32): LibraryFlashcards(), previewImport(), LibraryImageReader(), ImageReader, MaterialReader(), sendExcerpt(), NotebookSpread, PdfReader (+24 more)

### Community 18 - "Agenda Reminders"
Cohesion: 0.15
Nodes (38): AgendaReminders, AgendaCalendarViews(), AgendaReminders(), Alert, readLocalList(), saveLocalList(), addDays(), agendaSearchText() (+30 more)

### Community 19 - "Cosmic Math Island Art"
Cohesion: 0.12
Nodes (36): CosmicDustArt(), animate(), CommonMathChest, MathPlaceTreasure(), acceptValue(), action(), animate(), play() (+28 more)

### Community 20 - "Note Capture & Handwriting Draft"
Cohesion: 0.10
Nodes (35): NoteCaptureTools(), collaborationInviteUrl(), copyCollaborationInvite(), decodeHandwritingDraft(), encodeHandwritingDraft(), base, draft, unpackDocumentIfPacked() (+27 more)

### Community 21 - "Local Workspace Validation"
Cohesion: 0.15
Nodes (47): hasCoreCollections(), isBingoBoard(), isEvent(), isFlashcard(), isFocusPreferences(), isFocusSession(), isGoal(), isHabit() (+39 more)

### Community 22 - "Handwriting Erase Tests"
Cohesion: 0.08
Nodes (26): Call, cover, ink, recordingContext(), render(), drawCoordinateSystem(), drawCoverMask(), drawHoverPreview() (+18 more)

### Community 23 - "Profile Social Backend"
Cohesion: 0.10
Nodes (32): Account, createProfileSocialHandler(), empty(), keyFor(), SocialState, SocialStore, key(), setup() (+24 more)

### Community 24 - "Bingo Planet & Review"
Cohesion: 0.10
Nodes (33): BingoPlanet(), BingoReview(), decide(), state, NumberBingo, PodiumPlace(), tick(), BingoIcon() (+25 more)

### Community 25 - "Agenda Focus Week & Fields"
Cohesion: 0.14
Nodes (28): AgendaFocusWeek(), PaperFlower(), dateText(), navigateOptions(), PaperDateField(), PaperTimeField(), parsedDate(), AgendaStudyHistory() (+20 more)

### Community 27 - "App Navigation"
Cohesion: 0.07
Nodes (31): MOBILE_ITEMS, MORE_ITEMS, NAVIGATION_SECTIONS, NavigationButton(), NavigationItem, NavigationProps, PageHeader(), Sidebar() (+23 more)

### Community 28 - "Handwriting Dash & Eraser"
Cohesion: 0.08
Nodes (32): dashPattern(), line, bounds(), boundsCache, capsule(), circle(), eraseInkArea(), eraseStrokeArea() (+24 more)

### Community 29 - "Onboarding Configuration"
Cohesion: 0.10
Nodes (33): handleOnboarding(), requestOnboardingConfiguration(), answers, configuration, modalityByAnswer, ONBOARDING_OPTIONS, OnboardingAnswers, OnboardingConfiguration (+25 more)

### Community 30 - "Handwriting Page Scene"
Cohesion: 0.08
Nodes (28): PageScene, PageSceneOptions, renderPage, scene, Brush, CoordinateStep, HandwritingBrushPanelProps, HandwritingCoordinatePanelProps (+20 more)

### Community 31 - "Focus Device & Pomodoro Notifications"
Cohesion: 0.10
Nodes (28): focusDeviceId(), notifyPomodoroPhase(), requestPomodoroNotifications(), NotificationMock, playPomodoroSound(), FOCUS_HEARTBEAT_LIMIT, FOCUS_SESSION_KEY, FocusSession (+20 more)

### Community 32 - "Language Switch & Error Boundary"
Cohesion: 0.08
Nodes (24): ConnectedDevices(), LanguageSwitch(), RoomErrorBoundary, HAND_TEMPLATES, MATERIALS, STEPS, TEAM_LINES, VocabularySwatActivity() (+16 more)

### Community 33 - "Handwriting Precision & Prediction"
Cohesion: 0.08
Nodes (23): compactPoints(), dist(), MAX_PREDICTED_LENGTH, MAX_PREDICTED_POINTS, MAX_PREDICTION_GAP, predictedTail(), line, withPredictedTail() (+15 more)

### Community 34 - "Bingo & Room Handler Tests"
Cohesion: 0.13
Nodes (20): handlerWith(), settings, createLocalRoomHandler(), harness(), Joined, roomWithTwo(), harness(), roomWithOneStudent() (+12 more)

### Community 35 - "Animated Places & Math Arcade"
Cohesion: 0.09
Nodes (23): AnimatedPlace(), HelenaRoomIcon(), HelenaRoomIconProps, MathArcade(), answer(), api(), start(), mathDigitsSvg (+15 more)

### Community 36 - "Rewards & Social Activity Cards"
Cohesion: 0.13
Nodes (27): RewardDate(), activityLabel(), SocialActivityCard(), socialNoticeId(), socialNoticeLabel(), SocialReward, NoticeGroup(), NoticeRow() (+19 more)

### Community 37 - "Lesson Activity Bank"
Cohesion: 0.10
Nodes (29): LessonBuilderView, ACTIVITY_LIBRARY, ActivityDefinition, CONTROL_LEVEL_LABELS, CONTROL_LEVELS, ControlLevel, findActivity(), listActivitiesByControlLevel() (+21 more)

### Community 38 - "Cloud State Codec"
Cohesion: 0.11
Nodes (26): cloudWireName(), decodeCloudItems(), encodeCloudItems(), supported, isReturningVisitor(), rememberReturningVisitor(), RETURNING_VISITOR_ITEM, SyncedItems (+18 more)

### Community 39 - "Notebook & Library Preferences"
Cohesion: 0.12
Nodes (20): DEFAULT_NOTEBOOK_PREFERENCES, NOTEBOOK_PREFERENCES_KEY, NotebookPreferences, readNotebookPreferences(), useNotebookPreferences(), defaults, NotificationPreferences, readNotificationPreferences() (+12 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (17): AccountAccessPanel(), cue(), run(), DiscordLink, recentLogin(), AccountProviderIcon(), EmailAuthForm(), submit() (+9 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (27): begin(), click(), correctAnswer(), seedFinal(), tick(), MathIslandJourney(), mathGameLearning(), readMathGame() (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (24): Entry, EXTRA, Format, QualityQuestion, choiceBounds(), Errors, originalChoiceErrors(), EMPTY_MATH_PROGRESS (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (25): profileLevel(), profileNotebook(), defaultStudyPreferences, hasStudyModality(), studyModalities, StudyPreferences, buildStudyRoute(), StudyRoute (+17 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (18): AppView, MathPracticeHero(), ProfileStreaks(), StudentDestinations(), StudentMetricIcon(), agendaTimeZone(), brazilianZones, resolveBrazilianZone() (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (23): distanceToSegment(), pointDistance(), stickyHeight(), stickyWidth(), strokeTouches(), TABLE_MAX_COLUMNS, TABLE_MAX_ROWS, tableAddColumn() (+15 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (20): add(), calculateMath(), CalculationError, divide(), formatted(), Linear, MathCalculation, multiply() (+12 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (20): ArcanaIcon(), ArcanaIconName, LibraryDialog(), ArcanaRarity(), OliverCardInspection(), OliverCard, groups, LABEL_COLORS (+12 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (16): openDatabase(), openIndexedWorkspaceStore(), connect(), fakeIndexedDbFactory(), WorkspaceKeyValueStore, serializeWorkspace(), WORKSPACE_RECOVERY_KEY, WORKSPACE_STORAGE_KEY (+8 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (17): clientAddress(), ipv6Prefix(), AuthRecord, createDiscordAuthHandler(), Dependencies, digest(), DiscordIdentity, isNonce() (+9 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (18): createProfileCompletionHandler(), setup(), ProfileJourney(), recommendations, complete, mocks, recommendation, serverHandle (+10 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (15): LOBBY_STATE, updateSettings, LocalRoom(), joinRoom(), markBingoWord(), playQuestionAudio(), prepareRoomProtection(), replayQuestionAudio() (+7 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (19): CloudflareAiJsonResponse, createCloudflareTtsProvider(), CachedSpeech, createSharedSpeechProvider(), SpeechGenerationRateLimitError, request, setup(), byteLength() (+11 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (27): Ctx, drawBackCover(), drawCover(), drawCreateCard(), drawDivider(), drawEndpaper(), drawPage(), fitText() (+19 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (19): createRoomAudioAuthorizer(), AUDIO_TYPES, createRoomRecordingHandler(), Dependencies, json(), matchesAudioType(), recordingKey(), StoredRecording (+11 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (18): LobbyParticipants(), ParticipantLevel(), RemoveParticipantButton(), people, RoomAvatar(), ana, FinderMark(), isFinderModule() (+10 more)

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (19): reward, readRoomXp(), recordRoomXp(), ROOM_XP_CHANGED, ROOM_XP_KEY, reward, readStudentResume(), Resume (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (22): clamp(), formOf(), HelenaMascot(), MascotProps, turnTo(), clamp(), OliverHeroArt(), REACTIONS (+14 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (20): assertPublicId(), createFirebaseCursorPublisher(), createFirebasePublicRoomPublisher(), createFirebaseRealtimeStore(), authorizedFetch(), firebasePublicStreamUrl(), FirebaseRealtimeConfig, SCOPES (+12 more)

### Community 59 - "Community 59"
Cohesion: 0.14
Nodes (19): AgendaActionIcon(), AgendaAttachmentPreview(), CalendarView, AgendaColorPalette(), COLORS, AgendaEventDetails(), upload(), EventDetailsDraft (+11 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (17): ArcanaShare(), prepare(), mocks, prepareShare(), achievementPng(), inlineAchievementArt(), paperBrandImage(), arcanaThumbnailPng() (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (26): clearStoredLocalRoomSession(), roomErrorMessage(), useLocalRoom(), assignTeam(), createRoom(), endRoom(), finalizeBingo(), joinRoom() (+18 more)

### Community 62 - "Community 62"
Cohesion: 0.15
Nodes (17): HelenaCapability, HelenaRequest, helenaModelInput(), request, createCloudflareTeacher(), HELENA_TEACHER_POLICY, TeacherConfig, config (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.09
Nodes (19): AccountVerification, AchievementAnnouncer, ActivityBankView, AppContent(), FocusView, hasCompletedOnboarding(), HelenaChat, LearnView (+11 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (24): analyzePlace(), byteAt(), exposedPixels(), EXPOSURE_ENVELOPES, flood(), Footprint, footprintOf(), inRegion() (+16 more)

### Community 65 - "Community 65"
Cohesion: 0.15
Nodes (21): capabilities, errorCodes, hasOnlyKeys(), HELENA_API_VERSION, HELENA_MAX_PROMPT_LENGTH, HELENA_MAX_SOURCE_COUNT, HELENA_MAX_SOURCE_LENGTH, HELENA_MAX_TOTAL_SOURCE_LENGTH (+13 more)

### Community 66 - "Community 66"
Cohesion: 0.14
Nodes (17): config, handleEvents, handleFeed, handleProfileSocial(), rateStore, token, achievementActivities(), cardActivities() (+9 more)

### Community 67 - "Community 67"
Cohesion: 0.14
Nodes (12): AgendaCloseIcon(), AgendaDetailIcon(), AgendaDurationClock(), AgendaFilters(), AgendaMetadataField(), AgendaMonthPicker(), PaperChoice(), AgendaToolbarAction (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (14): HandwritingShapeInsert(), HandwritingShapeInsertProps, SHAPES, Message, Motion, Position, suggestions, NotebookPreferenceFields() (+6 more)

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (15): HandwritingFooter(), HandwritingFooterProps, HandwritingHistoryBar(), HandwritingHistoryBarProps, HandwritingWritingWindow(), HandwritingWritingWindowProps, NoteCaptureToolsProps, ImportedPage (+7 more)

### Community 70 - "Community 70"
Cohesion: 0.14
Nodes (22): analyzeIsland(), buildInvasionTable(), byteAt(), Component, connectedComponents(), countInvasions(), ENVELOPE_CHECKS, fitWave() (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.10
Nodes (14): useNotebookShelfDrag(), autoScroll(), destination(), NotesView(), addPage(), animatePageEntry(), createPage(), createPageAtEnd() (+6 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (14): accountSetup(), Provider, reauthSetup(), accountDeviceId(), requestAccountDevices(), getFirebaseAccountServices(), loadFirebaseAccountServices(), mocks (+6 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (15): AgendaCharts(), colors, depths, ringSegment(), DigitSource, PaperDigits(), PaperDigitsSource(), PomodoroDial() (+7 more)

### Community 74 - "Community 74"
Cohesion: 0.11
Nodes (17): afterIdle(), AnimatedIsland(), IslandShift, loadSprites(), spritesBySource, buildIslandSprites, drawIsland, FakeImage (+9 more)

### Community 75 - "Community 75"
Cohesion: 0.17
Nodes (18): analyzeOffThread(), analyzeOnMainThread(), IslandAnalyzer, drawIsland(), drawMote(), drawSparkle(), drawWater(), PIVOT (+10 more)

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (14): constrain(), HelenaChat(), animate(), close(), pointerEnd(), pointerMove(), send(), stop() (+6 more)

### Community 77 - "Community 77"
Cohesion: 0.14
Nodes (10): drawClaspStrap(), drawPageEdges(), drawSpine(), boardGeometry(), canvas(), disposeTree(), mirroredUv(), quad() (+2 more)

### Community 78 - "Community 78"
Cohesion: 0.17
Nodes (14): readEventStream(), readModelStream(), HelenaErrorCode, createFirebaseSocialWatcher(), encoder, packet(), payload, servers (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.20
Nodes (15): error(), handleOlena(), json(), isOlenaIslandId(), methodologies, OLENA_API_ENDPOINT, OLENA_API_VERSION, OlenaApiError (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.18
Nodes (8): Props, RoomRecordingInput(), save(), RecordedRoomPlayer, loadRoomRecording(), MAX_ROOM_RECORDING_BYTES, requestRecording(), uploadRoomRecording()

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (13): ARCANA_IDS, LEGACY_CARDS, drawOliverCards(), OLIVER_CARDS, OliverCardId, randomCardRoll(), roll(), effectiveCardFavorites() (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.13
Nodes (15): createFirebaseAccountIdentity(), PublicKey, publicKeys(), createFirebaseAccessTokenProvider(), config, handleProfileCompletion, rateStore, token (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.17
Nodes (16): initialEventDetails(), months, RangeDate(), occurrenceDuration(), agendaItemColor(), agendaSubjectName(), agendaSubjects(), uiLocale() (+8 more)

### Community 84 - "Community 84"
Cohesion: 0.17
Nodes (11): DeleteAccountPanel(), DeleteAccountPanelProps, Status, accountConfirmationName(), AccountDeletionError, AccountDeletionFailure, AccountDeletionSteps, AccountIdentity (+3 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (11): PRIVACY_NOTICE_KEY, PRIVACY_CONSENT_ITEM, PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION, PrivacyConsent, readPrivacyConsent(), html, text (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.30
Nodes (16): bankQuestion(), mergeSyncedItems(), valueAt(), assessGame(), gameQuestion(), countSolved(), gameCompletion(), MATH_GAME_KEY (+8 more)

### Community 87 - "Community 87"
Cohesion: 0.19
Nodes (16): Account, adminToken, config, dbToken, forgetOwner(), handleDiscordAuth(), hasPassword(), oauthHandler (+8 more)

### Community 88 - "Community 88"
Cohesion: 0.16
Nodes (11): accountKey(), createProfileHandleHandler(), HandleIdentity, HandleRegistry, HandleSnapshot, HandleStore, isReservedHandle(), LOOKALIKES (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.19
Nodes (16): beginRound(), savePreparedRecordings(), acceptedListeningAnswers(), buildListeningDeck(), createListeningRound(), differsByOneEdit(), isListeningAnswerCorrect(), ListeningCard (+8 more)

### Community 90 - "Community 90"
Cohesion: 0.18
Nodes (13): NotebookSearch(), NotebookSearchProps, SOURCE_LABEL, workspace, fold(), MAX_HITS, MIN_QUERY_LENGTH, pageTexts() (+5 more)

### Community 91 - "Community 91"
Cohesion: 0.20
Nodes (11): App(), GUEST_NAME, GUEST_NICKNAME_KEY, GUEST_NICKNAME_MAX, GUEST_SESSION_KEY, isGuestSession(), normalizeGuestNickname(), readGuestNickname() (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.35
Nodes (16): challengeQuestion(), assessMastery(), context(), dueRecovery(), location(), mistakeKind(), nextMasteryQuestion(), recoveryQuestion() (+8 more)

### Community 93 - "Community 93"
Cohesion: 0.17
Nodes (10): LOCAL_ROOM_SESSION_KEY, normalizeRoomState(), readStoredLocalRoomSession(), lobby, Role, RoomConnectionStatus, RoomRequestError, RoomTimeoutError (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.18
Nodes (9): SocialActivityPublisher, SocialActivityPublisher(), subscribeSocialUpdates(), mocks, SOCIAL_CHANGED, changes, sharedFeed(), mocks (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.18
Nodes (13): HelenaProvider, calculatedAnswer(), createMathGroundedProvider(), providers(), request, handleHelenaRuntime(), handler, identity (+5 more)

### Community 96 - "Community 96"
Cohesion: 0.39
Nodes (13): mathResponse(), isMathCourse(), assessMath(), assessChallenge(), ChallengeResult, nextChallenge(), requestChallenge(), challengeCompletion() (+5 more)

### Community 97 - "Community 97"
Cohesion: 0.18
Nodes (11): profileAllowedOrigins, accountKey(), createSupportHandler(), deleteSupportAccount(), Inbox, setup(), store, handleSupport (+3 more)

### Community 98 - "Community 98"
Cohesion: 0.21
Nodes (11): ACCESSIBILITY_KEY, AccessibilityPreferences, apply(), defaults, initializeAccessibility(), isNotebook3dPreferred(), listeners, read() (+3 more)

### Community 99 - "Community 99"
Cohesion: 0.18
Nodes (13): Area, bead(), diamond(), gleam(), hop(), shine(), spin(), sway() (+5 more)

### Community 100 - "Community 100"
Cohesion: 0.26
Nodes (11): createAccountDevicesHandler(), deviceAccountKey(), setup(), config, handleAccountDevices, removeAccountDevices(), store, AccountDevice (+3 more)

### Community 101 - "Community 101"
Cohesion: 0.21
Nodes (10): createRoomViaApi(), post(), store, MAX_ROOM_PARTICIPANTS, READY_LISTENING_DECK, READY_LISTENING_SOURCE, READY_WORD_IDS, readyListeningAudioUrl() (+2 more)

### Community 102 - "Community 102"
Cohesion: 0.22
Nodes (9): ArcanaRadiance(), PaperRadiance(), positions, OliverCardCollection(), LegacyCardId, COSMIC_RARITIES, oliverRarity(), OLIVER_TAROT (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.30
Nodes (14): readStoredOnboardingConfiguration(), endGuestSession(), recordPrivacyConsent(), applyGoogleLogin(), clearPendingAnswers(), enterAsGuest(), exchangeDiscord(), GoogleLogin() (+6 more)

### Community 104 - "Community 104"
Cohesion: 0.21
Nodes (10): createDiscordInteractionsHandler(), DISCORD_COMMAND_REPLIES, DiscordInteractionsOptions, ED25519_SPKI_PREFIX, allowedGuildIds, handleDiscordInteractions, handler(), { publicKey, privateKey } (+2 more)

### Community 105 - "Community 105"
Cohesion: 0.22
Nodes (13): selectionSize(), stroke(), useHarness(), useSelectionActions(), addPasted(), alignSelection(), copySelection(), cutSelection() (+5 more)

### Community 106 - "Community 106"
Cohesion: 0.27
Nodes (9): lessons, passesArithmeticCheck(), createLearningHandler(), Dependencies, Draft, reply(), State, setup() (+1 more)

### Community 107 - "Community 107"
Cohesion: 0.15
Nodes (6): created, FakeAudio, FakeRive, Options, played, wasm

### Community 108 - "Community 108"
Cohesion: 0.26
Nodes (8): HelenaResponse, byteLength(), createHelenaHandler(), errorResponse(), HelenaHandlerDependencies, HelenaRateLimiter, jsonResponse(), validRequest

### Community 109 - "Community 109"
Cohesion: 0.27
Nodes (8): clamp(), NotebookPaperTools(), commit(), end(), place(), placeResolved(), save(), update()

### Community 110 - "Community 110"
Cohesion: 0.17
Nodes (4): created, FakeRive, Options, wasm

### Community 111 - "Community 111"
Cohesion: 0.26
Nodes (8): PROFILE_HANDLE_CHANGED, ProfileHandle, mocks, changes, empty, loadHandle(), mocks, useProfileHandle()

### Community 112 - "Community 112"
Cohesion: 0.17
Nodes (9): PartSpec, bush, CREAM, floating, GOLD, GREEN, Rect, resting (+1 more)

### Community 113 - "Community 113"
Cohesion: 0.20
Nodes (5): answerHarness(), FakeStream, participantSession(), playingState, roomResponse()

### Community 114 - "Community 114"
Cohesion: 0.29
Nodes (7): serve(), createVercelHandler(), MAX_REQUEST_BODY_BYTES, readBody(), RequestBodyTooLargeError, toWebRequest(), VercelRequest

### Community 115 - "Community 115"
Cohesion: 0.38
Nodes (6): dedupeControls(), dist(), MAX_CONTROL_POINTS, segment(), splinePoints(), Vec

### Community 116 - "Community 116"
Cohesion: 0.20
Nodes (5): created, FakeRive, Options, props, wasm

### Community 118 - "Community 118"
Cohesion: 0.24
Nodes (6): NotebookPageIndex(), endDrag(), nearestIndex(), pointerMove(), pointerUp(), pages

### Community 119 - "Community 119"
Cohesion: 0.42
Nodes (7): areHapticsEnabled(), controlFor(), initializeAppHaptics(), Interaction, settingsChangeHaptic(), settingsClickHaptic(), settingsPulse()

### Community 120 - "Community 120"
Cohesion: 0.42
Nodes (6): normalize(), pathForView(), VIEW_PATHS, viewFromPath(), resolve(), useAppView()

### Community 121 - "Community 121"
Cohesion: 0.24
Nodes (4): PinchInput, setup(), TouchLike, usePinchZoom()

### Community 122 - "Community 122"
Cohesion: 0.28
Nodes (4): ArcanaCardPrototype(), OnboardingPaperIcon(), symbols, PaperCardTitle()

### Community 123 - "Community 123"
Cohesion: 0.28
Nodes (5): downloadCanvasAsPdf(), append(), object(), exportPage(), MAX_NOTE_ASSET_DATA_URL_LENGTH

### Community 124 - "Community 124"
Cohesion: 0.31
Nodes (6): ProfileCards(), cue(), favorite(), inspect(), saveFavorites(), useCardHighlightDrag()

### Community 125 - "Community 125"
Cohesion: 0.25
Nodes (7): createNotebookSound(), buffer(), play(), unlock(), CUES, Layer, NotebookSoundCue

### Community 126 - "Community 126"
Cohesion: 0.39
Nodes (6): BOARD, manifest, TOMATO_ART, TOMATO_BITES, tomatoStage(), useDisplayedTomatoStage()

### Community 127 - "Community 127"
Cohesion: 0.32
Nodes (5): supportRelayConfiguration, supportRelayEvent, SupportRelayTransport, message, ticket

### Community 128 - "Community 128"
Cohesion: 0.32
Nodes (5): NotebookPageJourney(), finish(), start(), NotebookPageJourneyState, originalAnimate

### Community 129 - "Community 129"
Cohesion: 0.29
Nodes (4): ProfileView(), changeAccessibility(), toggleModality(), updateStudyPreferences()

### Community 130 - "Community 130"
Cohesion: 0.38
Nodes (5): TERMS_OF_USE_PATH, TERMS_OF_USE_VERSION, html, policy, text

### Community 131 - "Community 131"
Cohesion: 0.38
Nodes (5): cache, TarotMeaning, useTarotMeaning(), load(), valid()

### Community 135 - "Community 135"
Cohesion: 0.47
Nodes (4): dragTo(), hit(), originalHitTest, pointer()

### Community 136 - "Community 136"
Cohesion: 0.70
Nodes (3): BRAND_FOOTER_ICON, BRAND_FOOTER_TEXT, BrandFooter()

### Community 137 - "Community 137"
Cohesion: 0.60
Nodes (3): arithmeticPoints(), ArithmeticQuestion, createArithmeticQuestion()

### Community 138 - "Community 138"
Cohesion: 0.40
Nodes (4): getToken, initializeApp, initializeAppCheck, ReCaptchaEnterpriseProvider

### Community 139 - "Community 139"
Cohesion: 0.40
Nodes (4): en, Entry, fields, pt

### Community 140 - "Community 140"
Cohesion: 0.70
Nodes (3): brazilianHoliday(), easterDate(), FIXED

### Community 142 - "Community 142"
Cohesion: 0.40
Nodes (4): fontCss, index, policy, vercel

### Community 144 - "Community 144"
Cohesion: 0.50
Nodes (3): config, HeaderRule, headers

## Knowledge Gaps
- **577 isolated node(s):** `HELENA_MAX_PROMPT_LENGTH`, `HELENA_MAX_SOURCE_LENGTH`, `HELENA_MAX_TOTAL_SOURCE_LENGTH`, `HelenaSourceKind`, `HelenaSelectedSource` (+572 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 918 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `uiText()` connect `Privacy, Sharing & Devices` to `3D Notebook Book Rendering`, `Community 129`, `Handwriting Cursor & Ink Options`, `Community 132`, `Bingo Ball Palette`, `Notebook Collaboration Backend`, `Page Canvas Drawing`, `Profile Avatar & Achievements UI`, `Community 136`, `Achievement Announcer & Art`, `Export & Loading Components`, `Listening Quiz`, `Agenda Progress & Pomodoro Controls`, `Notebook 3D Model Math`, `Bingo Winners & Room Config`, `Onboarding & Notebook Spread Tests`, `Library Flashcards & Readers`, `Agenda Reminders`, `Cosmic Math Island Art`, `Note Capture & Handwriting Draft`, `Local Workspace Validation`, `Handwriting Erase Tests`, `Profile Social Backend`, `Bingo Planet & Review`, `Agenda Focus Week & Fields`, `Notebook Scene Renderer`, `App Navigation`, `Onboarding Configuration`, `Handwriting Page Scene`, `Focus Device & Pomodoro Notifications`, `Language Switch & Error Boundary`, `Animated Places & Math Arcade`, `Rewards & Social Activity Cards`, `Lesson Activity Bank`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 59`, `Community 60`, `Community 61`, `Community 63`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 72`, `Community 73`, `Community 76`, `Community 80`, `Community 83`, `Community 84`, `Community 85`, `Community 89`, `Community 90`, `Community 93`, `Community 94`, `Community 102`, `Community 103`, `Community 109`, `Community 111`, `Community 118`, `Community 122`, `Community 124`?**
  _High betweenness centrality (0.320) - this node is a cross-community bridge._
- **Why does `useLanguage()` connect `Privacy, Sharing & Devices` to `3D Notebook Book Rendering`, `Community 129`, `Handwriting Cursor & Ink Options`, `Community 132`, `Bingo Ball Palette`, `Page Canvas Drawing`, `Profile Avatar & Achievements UI`, `Community 136`, `Achievement Announcer & Art`, `Export & Loading Components`, `Listening Quiz`, `Agenda Progress & Pomodoro Controls`, `Bingo Winners & Room Config`, `Library Flashcards & Readers`, `Agenda Reminders`, `Cosmic Math Island Art`, `Note Capture & Handwriting Draft`, `Bingo Planet & Review`, `Agenda Focus Week & Fields`, `App Navigation`, `Onboarding Configuration`, `Handwriting Page Scene`, `Focus Device & Pomodoro Notifications`, `Language Switch & Error Boundary`, `Animated Places & Math Arcade`, `Rewards & Social Activity Cards`, `Lesson Activity Bank`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 55`, `Community 59`, `Community 63`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 73`, `Community 76`, `Community 80`, `Community 83`, `Community 84`, `Community 85`, `Community 90`, `Community 91`, `Community 103`, `Community 109`, `Community 118`, `Community 124`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `HandwritingStudio()` connect `Page Canvas Drawing` to `Privacy, Sharing & Devices`, `Handwriting Geometry Bounds`, `Handwriting Cursor & Ink Options`, `Notebook Collaboration Backend`, `Export & Loading Components`, `Community 141`, `Cosmic Math Island Art`, `Note Capture & Handwriting Draft`, `Handwriting Erase Tests`, `Handwriting Page Scene`, `Handwriting Precision & Prediction`, `Notebook & Library Preferences`, `Community 45`, `Community 69`, `Community 83`, `Community 105`, `Community 115`, `Community 121`, `Community 123`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `HandwritingStudio()` (e.g. with `redo()` and `remember()`) actually correct?**
  _`HandwritingStudio()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HELENA_MAX_PROMPT_LENGTH`, `HELENA_MAX_SOURCE_LENGTH`, `HELENA_MAX_TOTAL_SOURCE_LENGTH` to the rest of the system?**
  _577 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Privacy, Sharing & Devices` be split into smaller, more focused modules?**
  _Cohesion score 0.037126995142262316 - nodes in this community are weakly interconnected._
- **Should `3D Notebook Book Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.05349324195697697 - nodes in this community are weakly interconnected._
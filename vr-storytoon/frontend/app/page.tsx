"use client";



import { useEffect, useState } from "react";





const styles = [

  {

    id: "cartoon",

    icon: "🦁",

    title: "3D Cartoon",

    desc: "Bright & playful",

  },

  {

    id: "cinematic",

    icon: "🏰",

    title: "Cinematic",

    desc: "Movie-like scenes",

  },

  {

    id: "anime",

    icon: "🌸",

    title: "Anime",

    desc: "Anime inspired",

  },

  {

    id: "storybook",

    icon: "📖",

    title: "Storybook",

    desc: "Soft illustrated",

  },

];





const pipeline = [

  {

    icon: "📝",

    title: "Planning Story",

    text: "Understanding your story",

  },

  {

    icon: "🦁",

    title: "Creating Characters",

    text: "Consistent identities",

  },

  {

    icon: "🏞️",

    title: "Generating Scenes",

    text: "Cinematic cartoon frames",

  },

  {

    icon: "🎬",

    title: "Animating Story",

    text: "Bringing scenes to life",

  },

  {

    icon: "🎙️",

    title: "Adding Voices",

    text: "Character voices",

  },

  {

    icon: "🎵",

    title: "Sound Effects",

    text: "Building atmosphere",

  },

  {

    icon: "🎞️",

    title: "Final Movie",

    text: "Your story is ready!",

  },

];





export default function Home() {



  const [story, setStory] = useState("");



  const [visualStyle, setVisualStyle] =

    useState("cartoon");



  const [narratorVoice, setNarratorVoice] =

    useState("auto");



  const [isGenerating, setIsGenerating] =

    useState(false);



  const [statusMessage, setStatusMessage] =

    useState("");



  const [error, setError] =

    useState("");



  const [result, setResult] = useState<any>(null);
  const [activePanel, setActivePanel] = useState<"stories" | "gallery" | "about" | null>(null);
  const [savedStories, setSavedStories] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("vr-storytoon-stories");
      if (stored) setSavedStories(JSON.parse(stored));
    } catch (storageError) {
      console.warn("Unable to load saved StoryToon stories:", storageError);
    }
  }, []);

  const saveStoryToHistory = (completedResult: any) => {
    const entry = {
      id: `${Date.now()}`,
      title: completedResult?.title || "My Animated Story",
      story: story.trim(),
      visualStyle,
      narratorVoice,
      createdAt: new Date().toISOString(),
      sceneCount: completedResult?.generated_videos?.length || 0,
    };

    // Keep the state updater pure. Save to localStorage outside the updater
    // so React Strict Mode cannot run a storage side-effect twice.
    const next = [
      entry,
      ...savedStories.filter((item) => item.story !== entry.story),
    ].slice(0, 50);

    setSavedStories(next);

    try {
      window.localStorage.setItem("vr-storytoon-stories", JSON.stringify(next));
    } catch (storageError) {
      console.warn("Unable to save StoryToon history:", storageError);
      setError("Story generated, but this browser could not save it to My Stories. Check browser storage/privacy settings.");
    }
  };





  
  // =====================================================
  // BACKEND
  // =====================================================

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:8000";

  // =====================================================
  // FINAL VIDEO URL
  // =====================================================

  const finalVideoUrl = result
    ? `${BACKEND_URL}/generated/final/story_final.mp4?t=${Date.now()}`
    : "";





  // =====================================================

  // SLEEP HELPER

  // =====================================================



  const sleep = (ms: number) =>

    new Promise((resolve) =>

      setTimeout(resolve, ms)

    );





  // =====================================================

  // GENERATE STORY

  // =====================================================



  const handleGenerate = async () => {



    if (

      !story.trim() ||

      isGenerating

    ) {

      return;

    }





    setIsGenerating(true);



    setError("");



    setResult(null);



    setStatusMessage(

      "📝 Starting your story generation..."

    );





    try {



      const response = await fetch(

        `${BACKEND_URL}/api/generate-story`,

        {

          method: "POST",



          headers: {

            "Content-Type":

              "application/json",

          },



          body: JSON.stringify({

            story: story.trim(),

            visual_style: visualStyle,

            narrator_voice: narratorVoice,

          }),

        }

      );





      const rawText =

        await response.text();



      let data: any = null;





      try {



        data = rawText

          ? JSON.parse(rawText)

          : null;



      } catch {



        data = null;



      }





      if (!response.ok) {



        throw new Error(

          data?.detail ||

          data?.message ||

          rawText ||

          "Story generation could not be started."

        );



      }





      if (

        !data?.success ||

        !data?.job_id

      ) {



        throw new Error(

          data?.message ||

          "Backend did not return a story job ID."

        );



      }





      const jobId =

        data.job_id;



      const startedAt =

        Date.now();



      const MAX_WAIT_MS =

        30 * 60 * 1000;





      setStatusMessage(

        "📝 Story generation queued..."

      );





      while (true) {



        if (

          Date.now() - startedAt >

          MAX_WAIT_MS

        ) {



          throw new Error(

            "Story generation is taking longer than expected. Please check the backend console."

          );



        }





        await sleep(2000);





        const jobResponse =

          await fetch(

            `${BACKEND_URL}/api/generate-story/${jobId}`,

            {

              cache: "no-store",

            }

          );





        const jobRawText =

          await jobResponse.text();



        let jobData: any = null;





        try {



          jobData = jobRawText

            ? JSON.parse(jobRawText)

            : null;



        } catch {



          jobData = null;



        }





        if (!jobResponse.ok) {



          throw new Error(

            jobData?.detail ||

            jobData?.message ||

            jobRawText ||

            "Unable to check story generation status."

          );



        }





        const status =

          jobData?.status;





        if (

          status === "queued"

        ) {



          setStatusMessage(

            jobData?.message ||

            "📝 Story generation queued..."

          );





        } else if (

          status === "running"

        ) {



          setStatusMessage(

            jobData?.message ||

            "🎬 AI is creating scenes, animation, voices and sound..."

          );





        } else if (

          status === "failed"

        ) {



          throw new Error(

            jobData?.error ||

            jobData?.message ||

            "Story generation failed."

          );





        } else if (

          status === "completed"

        ) {



          const completedResult =

            jobData?.result;





          if (!completedResult) {



            throw new Error(

              "Story job completed but no final result was returned."

            );



          }





          setResult({

            success: true,

            data: completedResult,

          });
          saveStoryToHistory(completedResult);





          setStatusMessage(

            "🎉 Your animated story is ready!"

          );





          break;





        } else {



          setStatusMessage(

            "🎬 AI is processing your story..."

          );



        }



      }





    } catch (err) {



      console.error(

        "Generate story error:",

        err

      );





      setError(

        err instanceof Error

          ? err.message

          : "Unable to connect to StoryToon backend."

      );





      setStatusMessage("");





    } finally {



      setIsGenerating(false);



    }



  };





  // =====================================================

  // UI

  // =====================================================



  return (



    <main className="page">



      <div className="skyDecor cloud cloudOne">

        ☁️

      </div>



      <div className="skyDecor cloud cloudTwo">

        ☁️

      </div>



      <div className="sparkle s1">

        ✦

      </div>



      <div className="sparkle s2">

        ✦

      </div>



      <div className="sparkle s3">

        ✦

      </div>





      {/* =================================================

          NAVBAR

      ================================================= */}





      <nav className="navbar">



        <div className="brand">



          <div className="brandIcon">

            🎬

          </div>





          <div>



            <div className="brandName">



              VR{" "}



              <span>

                StoryToon AI

              </span>



            </div>





            <div className="brandTag">



              Turn stories into animated adventures



            </div>



          </div>



        </div>





        <div className="navLinks">



          <button
            type="button"
            className={activePanel === null ? "navActive" : ""}
            onClick={() => {
              setActivePanel(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            🏠 Home
          </button>

          <button type="button" className={activePanel === "stories" ? "navActive" : ""} onClick={() => setActivePanel("stories")}>
            📚 My Stories
          </button>

          <button type="button" className={activePanel === "gallery" ? "navActive" : ""} onClick={() => setActivePanel("gallery")}>
            🖼️ Gallery
          </button>

          <button type="button" className={activePanel === "about" ? "navActive" : ""} onClick={() => setActivePanel("about")}>
            ✨ About
          </button>



        </div>





        <div className="aiBadge">



          ✨ Powered by AI



        </div>



            </nav>

      {activePanel && (
        <section className="card" aria-live="polite" style={{ maxWidth: "1100px", width: "calc(100% - 32px)", margin: "24px auto", padding: "24px", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "24px" }}>
                {activePanel === "stories" ? "📚 My Stories" : activePanel === "gallery" ? "🖼️ Gallery" : "✨ About VR StoryToon AI"}
              </h2>
              <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
                {activePanel === "stories" ? "Your recently generated story details, saved in this browser." : activePanel === "gallery" ? "Watch the latest generated video available in this session." : "Turn your imagination into animated adventures with AI-created scenes, character voices and sound effects."}
              </p>
            </div>
            <button type="button" onClick={() => setActivePanel(null)} style={{ border: "1px solid #eadcff", borderRadius: "12px", padding: "10px 14px", background: "white", cursor: "pointer", fontWeight: 700 }}>
              ✕ Close
            </button>
          </div>

          {activePanel === "stories" && (
            savedStories.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                {savedStories.map((item) => (
                  <article key={item.id} style={{ border: "1px solid #eadcff", borderRadius: "16px", padding: "16px", background: "#fff" }}>
                    <h3 style={{ margin: "0 0 8px" }}>{item.title}</h3>
                    <p style={{ margin: "0 0 10px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", opacity: 0.8 }}>{item.story}</p>
                    <small style={{ display: "block", opacity: 0.7 }}>Style: {item.visualStyle} · Voice: {item.narratorVoice} · Scenes: {item.sceneCount}</small>
                    <small style={{ display: "block", marginTop: "6px", opacity: 0.7 }}>{new Date(item.createdAt).toLocaleString()}</small>
                    <button type="button" onClick={() => { setStory(item.story || ""); setVisualStyle(item.visualStyle || "cartoon"); setNarratorVoice(item.narratorVoice || "auto"); setActivePanel(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ marginTop: "12px", border: 0, borderRadius: "10px", padding: "9px 12px", background: "#8c63ff", color: "white", cursor: "pointer", fontWeight: 700 }}>
                      Use this story again
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{ padding: "30px 12px", textAlign: "center", border: "1px dashed #d9c8ff", borderRadius: "16px" }}>
                <p style={{ fontSize: "32px", margin: "0 0 8px" }}>📖</p>
                <strong>No stories saved yet</strong>
                <p style={{ marginBottom: 0, opacity: 0.7 }}>Generate your first story and it will appear here in this browser.</p>
              </div>
            )
          )}

          {activePanel === "gallery" && (
            result ? (
              <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
                <h3>{result?.data?.title || "Your latest animated story"}</h3>
                <video controls playsInline preload="metadata" src={finalVideoUrl} style={{ width: "100%", maxHeight: "480px", background: "#111", borderRadius: "14px" }} />
                <a href={finalVideoUrl} download="VR-StoryToon-Story.mp4" style={{ display: "inline-block", marginTop: "14px", padding: "11px 18px", borderRadius: "12px", background: "linear-gradient(135deg, #8c63ff, #ff78b7)", color: "white", textDecoration: "none", fontWeight: 800 }}>⬇️ Download latest video</a>
                <p style={{ fontSize: "12px", opacity: 0.7 }}>The backend currently exposes one final-video path, so this panel shows the latest output rather than a permanent archive of separate video files.</p>
              </div>
            ) : (
              <div style={{ padding: "30px 12px", textAlign: "center", border: "1px dashed #d9c8ff", borderRadius: "16px" }}>
                <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🎬</p>
                <strong>No generated video available yet</strong>
                <p style={{ marginBottom: 0, opacity: 0.7 }}>Create a story first; your latest video will be shown here.</p>
              </div>
            )
          )}

          {activePanel === "about" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              {[
                ["📝 Story planning", "Turn your idea into a structured story."],
                ["🦁 Characters and scenes", "Build visual scenes in your selected style."],
                ["🎙️ Voices and SFX", "Add narration or character voices and atmosphere."],
                ["🎞️ Animated output", "Preview and download the final video when generation succeeds."],
              ].map(([heading, description]) => (
                <div key={heading} style={{ padding: "16px", border: "1px solid #eadcff", borderRadius: "14px", background: "#fff" }}>
                  <h3 style={{ marginTop: 0 }}>{heading}</h3>
                  <p style={{ marginBottom: 0, opacity: 0.75 }}>{description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =================================================
          HERO

      ================================================= */}





      <section className="hero">



        <div className="heroCharacter leftCharacter">



          <div className="characterBubble">

            💡

          </div>



          <div className="characterEmoji">

            🧒🏻

          </div>



          <div className="grass">

            🌿🌼🌿

          </div>



        </div>





        <div className="heroCenter">



          <div className="miniLabel">



            ✨ YOUR STORY • OUR AI • ONE MOVIE ✨



          </div>





          <h1>



            Turn Your Story Into An



            <span>

              {" "}Animated Adventure!

            </span>



          </h1>





          <p>



            Write your imagination and watch AI

            transform it into characters, scenes,

            animation, voices and magical sound.



          </p>





          <div className="heroChips">



            <span>

              🦁 Consistent Characters

            </span>



            <span>

              🎬 AI Animation

            </span>



            <span>

              🎙️ Character Voices

            </span>



            <span>

              🎵 Cinematic SFX

            </span>



          </div>



        </div>





        <div className="heroCharacter rightCharacter">



          <div className="bird">

            🐦

          </div>



          <div className="castle">

            🏰

          </div>



          <div className="grass">

            🌲🌿🌲

          </div>



        </div>



      </section>





      {/* =================================================

          STUDIO

      ================================================= */}





      <section className="studio">





        {/* STORY INPUT */}





        <div className="storyCard card">



          <div className="cardTitle">



            <span className="number">

              1

            </span>





            <div>



              <h2>

                ✏️ Write Your Story

              </h2>



              <p>

                Every great adventure starts with an idea!

              </p>



            </div>



          </div>





          <div className="textareaWrap">



            <textarea



              value={story}



              maxLength={5000}



              disabled={isGenerating}



              onChange={(e) =>

                setStory(e.target.value)

              }



              placeholder={

                `Once upon a time in a magical forest...\n\nExample: A young explorer discovered a mysterious glowing door hidden behind the trees...`

              }



            />





            <span className="count">



              {story.length} / 5000



            </span>



          </div>





          <div className="storyTip">



            💡{" "}



            <span>



              Add characters, dialogue and actions

              for richer animated scenes.



            </span>



          </div>



        </div>





        {/* =================================================

            SETTINGS

        ================================================= */}





        <div className="settingsCard card">





          {/* VISUAL STYLE */}





          <div className="settingBlock">



            <div className="cardTitle compact">



              <span className="number">

                2

              </span>



              <h2>

                🎨 Choose Visual Style

              </h2>



            </div>





            <div className="styleGrid">



              {styles.map(

                (item) => (



                  <button



                    key={item.id}



                    disabled={isGenerating}



                    className={

                      `styleOption ${

                        visualStyle === item.id

                          ? "selected"

                          : ""

                      }`

                    }



                    onClick={() =>

                      setVisualStyle(

                        item.id

                      )

                    }



                  >



                    {visualStyle ===

                      item.id && (



                      <span className="check">

                        ✓

                      </span>



                    )}





                    <span className="styleIcon">

                      {item.icon}

                    </span>





                    <strong>

                      {item.title}

                    </strong>





                    <small>

                      {item.desc}

                    </small>



                  </button>



                )

              )}



            </div>



          </div>





          {/* NARRATOR VOICE */}





          <div className="settingBlock">



            <div className="cardTitle compact">



              <span className="number orange">

                3

              </span>



              <h2>

                🎙️ Narrator Voice

              </h2>



            </div>





            <div

              style={{

                display: "grid",

                gridTemplateColumns:

                  "repeat(auto-fit, minmax(110px, 1fr))",

                gap: "12px",

              }}

            >



              {[

                {

                  id: "auto",

                  title: "Auto",

                  icon: "✨",

                  desc: "AI chooses",

                },

                {

                  id: "female",

                  title: "Female",

                  icon: "👩",

                  desc: "Female voice",

                },

                {

                  id: "male",

                  title: "Male",

                  icon: "👨",

                  desc: "Male voice",

                },

              ].map((item) => (



                <button

                  key={item.id}

                  type="button"

                  disabled={isGenerating}

                  onClick={() =>

                    setNarratorVoice(item.id)

                  }

                  style={{

                    position: "relative",

                    border:

                      narratorVoice === item.id

                        ? "2px solid #8c63ff"

                        : "1px solid #eadcff",

                    borderRadius: "16px",

                    padding: "14px 10px",

                    background:

                      narratorVoice === item.id

                        ? "#f6f0ff"

                        : "white",

                    cursor: isGenerating

                      ? "not-allowed"

                      : "pointer",

                    opacity: isGenerating

                      ? 0.7

                      : 1,

                  }}

                >



                  {narratorVoice === item.id && (



                    <span

                      style={{

                        position: "absolute",

                        top: "7px",

                        right: "9px",

                        fontWeight: 900,

                      }}

                    >

                      ✓

                    </span>



                  )}





                  <div

                    style={{

                      fontSize: "25px",

                      marginBottom: "4px",

                    }}

                  >

                    {item.icon}

                  </div>





                  <strong

                    style={{

                      display: "block",

                      fontSize: "14px",

                    }}

                  >

                    {item.title}

                  </strong>





                  <small

                    style={{

                      display: "block",

                      marginTop: "3px",

                      opacity: 0.65,

                    }}

                  >

                    {item.desc}

                  </small>



                </button>



              ))}



            </div>



          </div>





          {/* =================================================

              GENERATE BUTTON

          ================================================= */}





          <button



            className="generateBtn"



            disabled={

              !story.trim() ||

              isGenerating

            }



            onClick={

              handleGenerate

            }



          >



            <span>



              {isGenerating

                ? "🎬"

                : "✨"}



            </span>





            {isGenerating

              ? "Creating Your Story..."

              : "Generate My Story"}





            <span className="arrow">



              {isGenerating

                ? "⏳"

                : "➜"}



            </span>



          </button>





          <p className="autoText">



            🪄 AI decides the scenes and video duration

            from your story content automatically.



          </p>





          {/* =================================================

              STATUS

          ================================================= */}





          {statusMessage && (



            <div



              style={{

                marginTop: "14px",

                padding: "14px",

                borderRadius: "14px",

                background: "#f3efff",

                textAlign: "center",

                fontWeight: 700,

              }}



            >



              {statusMessage}



            </div>



          )}





          {/* =================================================

              ERROR

          ================================================= */}





          {error && (



            <div



              style={{

                marginTop: "14px",

                padding: "14px",

                borderRadius: "14px",

                background: "#fff0f0",

                color: "#c0392b",

                textAlign: "center",

                fontWeight: 700,

              }}



            >



              ❌ {error}



            </div>



          )}





          {/* =================================================

              FINAL STORY VIDEO

          ================================================= */}





          {result && (



            <div



              style={{

                marginTop: "18px",

                padding: "18px",

                borderRadius: "20px",

                background:

                  "linear-gradient(135deg, #f6f0ff, #fff3fa)",

                textAlign: "center",

                border:

                  "1px solid #eadcff",

                boxShadow:

                  "0 10px 30px rgba(115, 84, 170, 0.10)",

              }}



            >





              <div



                style={{

                  fontSize: "28px",

                  marginBottom: "6px",

                }}



              >



                🎬✨



              </div>





              <h2



                style={{

                  margin: "0",

                  fontSize: "22px",

                }}



              >



                Your Story is Ready!



              </h2>





              <p



                style={{

                  marginTop: "6px",

                  marginBottom: "14px",

                  opacity: 0.75,

                }}



              >



                {result?.data?.title ||

                  "Your Animated Story"}



              </p>





              {/* VIDEO PLAYER */}





              <div



                style={{

                  width: "100%",

                  overflow: "hidden",

                  borderRadius: "16px",

                  background: "#111",

                  boxShadow:

                    "0 8px 24px rgba(0,0,0,0.15)",

                }}



              >



                <video



                  key={finalVideoUrl}



                  controls



                  preload="metadata"



                  playsInline



                  src={finalVideoUrl}



                  style={{

                    display: "block",

                    width: "100%",

                    maxHeight: "480px",

                    background: "#000",

                  }}



                >



                  Your browser does not

                  support the video tag.



                </video>



              </div>





              {/* STORY INFO */}





              <p



                style={{

                  marginTop: "12px",

                  marginBottom: "14px",

                  fontSize: "14px",

                  opacity: 0.7,

                }}



              >



                🎞️{" "}



                {result?.data

                  ?.generated_videos

                  ?.length || 0}



                {" animated scenes"}



                {" • "}



                🎙️ Voices



                {" • "}



                🎵 Sound Effects



              </p>





              {/* DOWNLOAD BUTTON */}





              <a



                href={finalVideoUrl}



                download="VR-StoryToon-Story.mp4"



                style={{

                  display: "inline-flex",

                  alignItems: "center",

                  justifyContent:

                    "center",

                  gap: "8px",

                  padding:

                    "12px 22px",

                  borderRadius: "14px",

                  textDecoration: "none",

                  fontWeight: 800,

                  fontSize: "15px",

                  background:

                    "linear-gradient(135deg, #8c63ff, #ff78b7)",

                  color: "white",

                  boxShadow:

                    "0 7px 18px rgba(140, 99, 255, 0.25)",

                  cursor: "pointer",

                }}



              >



                ⬇️ Download Video



              </a>





              <p



                style={{

                  marginTop: "10px",

                  marginBottom: "0",

                  fontSize: "12px",

                  opacity: 0.6,

                }}



              >



                Download only if you want

                to save the movie to your

                device.



              </p>



            </div>



          )}



        </div>



      </section>





      {/* =================================================

          MAGIC PIPELINE

      ================================================= */}





      <section className="magicSection">



        <div className="magicHeading">



          <span>

            ✨

          </span>





          <div>



            <small>

              HOW THE MAGIC HAPPENS

            </small>



            <h2>

              The Magic Behind Your Story

            </h2>



          </div>





          <span>

            ✨

          </span>



        </div>





        <div className="pipeline">



          {pipeline.map(

            (step, index) => (



              <div



                className="pipelineItem"



                key={step.title}



              >



                <div className="stepCard">



                  <span className="stepNumber">



                    {String(

                      index + 1

                    ).padStart(

                      2,

                      "0"

                    )}



                  </span>





                  <div className="stepIcon">



                    {step.icon}



                  </div>





                  <h3>

                    {step.title}

                  </h3>





                  <p>

                    {step.text}

                  </p>



                </div>





                {index !==

                  pipeline.length -

                    1 && (



                  <div className="connector">



                    ➜



                  </div>



                )}



              </div>



            )

          )}



        </div>



      </section>





      {/* =================================================

          BOTTOM WORLD

      ================================================= */}





      <section className="bottomWorld">



        <div>

          🌲

        </div>



        <div className="animal">

          🐿️

        </div>



        <div>

          🌳

        </div>





        <p>



          Imagine it. Tell it.

          Watch it come alive.



        </p>





        <div>

          🌳

        </div>



        <div className="animal">

          🦊

        </div>



        <div>

          🌲

        </div>



      </section>





      {/* =================================================

          FOOTER

      ================================================= */}





      <footer>



        <strong>

          🎬 VR StoryToon AI

        </strong>



        <span>



          Where imagination becomes

          animation ✨



        </span>



      </footer>



    </main>



  );



}
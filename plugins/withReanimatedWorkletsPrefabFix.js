const { withProjectBuildGradle } = require("@expo/config-plugins");

const FIX_MARKER = "withReanimatedWorkletsPrefabFix";

const FIX_BLOCK = `
// ${FIX_MARKER}
// Ensure worklets/reanimated prefab packages exist before CMake configure tasks.
gradle.projectsEvaluated {
    def appProject = findProject(':app')
    def workletsProject = findProject(':react-native-worklets')
    def reanimatedProject = findProject(':react-native-reanimated')
    if (workletsProject == null || reanimatedProject == null) {
        return
    }

    def wireVariant = { String variant ->
        def prefabTaskName = "prefab\${variant}Package"
        if (!workletsProject.tasks.names.contains(prefabTaskName)) {
            return
        }

        def workletsPrefabTask = workletsProject.tasks.named(prefabTaskName)
        reanimatedProject.tasks
            .matching { it.name.startsWith("configureCMake\${variant}") }
            .configureEach { task ->
                task.dependsOn(workletsPrefabTask)
            }
    }

    wireVariant("Debug")
    wireVariant("Release")

    if (appProject != null) {
        def wireAppVariant = { String variant ->
            def prefabTasks = []
            [workletsProject, reanimatedProject].each { project ->
                def taskName = "prefab\${variant}Package"
                if (project.tasks.names.contains(taskName)) {
                    prefabTasks << project.tasks.named(taskName)
                }
            }
            if (prefabTasks.isEmpty()) {
                return
            }
            appProject.tasks
                .matching { it.name.startsWith("configureCMake\${variant}") }
                .configureEach { task ->
                    prefabTasks.each { prefabTask ->
                        task.dependsOn(prefabTask)
                    }
                }
        }

        wireAppVariant("Debug")
        wireAppVariant("Release")
    }
}
`;

module.exports = function withReanimatedWorkletsPrefabFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(FIX_MARKER)) {
      config.modResults.contents = `${config.modResults.contents.trim()}\n\n${FIX_BLOCK}\n`;
    }
    return config;
  });
};

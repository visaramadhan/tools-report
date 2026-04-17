const fs = require('fs');
const path = require('path');

function patchReactNativeStdFormat() {
  const targetPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'react-native',
    'ReactCommon',
    'react',
    'renderer',
    'core',
    'graphicsConversions.h'
  );

  if (!fs.existsSync(targetPath)) return;

  const original = fs.readFileSync(targetPath, 'utf8');

  const alreadyPatched =
    original.includes('std::to_string(dimension.value) + "%"') ||
    original.includes('std::to_string(dimension.value) + \"%\"');
  if (alreadyPatched) return;

  let next = original;

  if (!next.includes('#include <string>')) {
    const insertionPoint = next.indexOf('#include <unordered_map>');
    if (insertionPoint !== -1) {
      const lineEnd = next.indexOf('\n', insertionPoint);
      next = `${next.slice(0, lineEnd + 1)}#include <string>\n${next.slice(lineEnd + 1)}`;
    }
  }

  const before = 'return std::format("{}%", dimension.value);';
  const after = 'return std::to_string(dimension.value) + "%";';

  if (!next.includes(before)) {
    throw new Error(`Patch failed: expected line not found in ${targetPath}`);
  }

  next = next.replace(before, after);
  fs.writeFileSync(targetPath, next, 'utf8');
}

function patchReanimatedTransformInterpolator() {
  const headerPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'react-native-reanimated',
    'Common',
    'cpp',
    'reanimated',
    'CSS',
    'interpolation',
    'transforms',
    'TransformOperationInterpolator.h'
  );
  const cppPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'react-native-reanimated',
    'Common',
    'cpp',
    'reanimated',
    'CSS',
    'interpolation',
    'transforms',
    'TransformOperationInterpolator.cpp'
  );

  if (fs.existsSync(headerPath)) {
    const original = fs.readFileSync(headerPath, 'utf8');
    if (!original.includes('requires ResolvableOp<TOperation>')) {
      const before = 'template <ResolvableOp TOperation>\nclass TransformOperationInterpolator<TOperation>';
      const after = 'template <typename TOperation>\n  requires ResolvableOp<TOperation>\nclass TransformOperationInterpolator<TOperation>';
      if (original.includes(before)) {
        fs.writeFileSync(headerPath, original.replace(before, after), 'utf8');
      }
    }
  }

  if (fs.existsSync(cppPath)) {
    let original = fs.readFileSync(cppPath, 'utf8');
    if (!original.includes('requires ResolvableOp<TOperation>')) {
      original = original.replaceAll(
        'template <ResolvableOp TOperation>',
        'template <typename TOperation>\n  requires ResolvableOp<TOperation>'
      );
    }

    const designatedBefore =
      '  return ResolvableValueInterpolationContext{\n' +
      '      .node = context.node,\n' +
      '      .fallbackInterpolateThreshold = context.fallbackInterpolateThreshold,\n' +
      '      .viewStylesRepository = context.viewStylesRepository,\n' +
      '      .relativeProperty = config_.relativeProperty,\n' +
      '      .relativeTo = config_.relativeTo};\n';
    const designatedAfter =
      '  return ResolvableValueInterpolationContext{\n' +
      '      context.node,\n' +
      '      context.fallbackInterpolateThreshold,\n' +
      '      context.viewStylesRepository,\n' +
      '      config_.relativeProperty,\n' +
      '      config_.relativeTo};\n';
    if (original.includes(designatedBefore)) {
      original = original.replace(designatedBefore, designatedAfter);
    }

    fs.writeFileSync(cppPath, original, 'utf8');
  }
}

function patchExpoModulesCoreObjectPathMax() {
  const buildGradlePath = path.join(
    __dirname,
    '..',
    'node_modules',
    'expo',
    'node_modules',
    'expo-modules-core',
    'android',
    'build.gradle'
  );

  if (!fs.existsSync(buildGradlePath)) return;
  const original = fs.readFileSync(buildGradlePath, 'utf8');
  if (original.includes('-DCMAKE_OBJECT_PATH_MAX=')) return;

  const before = '          \"-DANDROID_STL=c++_shared\",';
  const after = '          \"-DANDROID_STL=c++_shared\",\\n          \"-DCMAKE_OBJECT_PATH_MAX=128\",';

  if (!original.includes(before)) return;
  fs.writeFileSync(buildGradlePath, original.replace(before, after), 'utf8');
}

try {
  patchReactNativeStdFormat();
  patchReanimatedTransformInterpolator();
  patchExpoModulesCoreObjectPathMax();
} catch (e) {
  process.stderr.write(String(e && e.stack ? e.stack : e) + '\n');
  process.exit(1);
}

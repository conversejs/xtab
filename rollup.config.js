import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';

export default [
    // browser-friendly UMD build
    {
        input: 'src/xtab.js',
        output: {
            name: 'XTab',
            file: 'dist/xtab.js',
            format: 'umd'
        },
        plugins: [
            resolve(),
            babel({
                babelrc: false,
                presets: [
                    ['@babel/preset-env', {
                        targets: {
                            browsers: '>5%'
                        }
                    }]
                ]
            })
        ]
    }
];

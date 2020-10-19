const plugins = [require('autoprefixer')] // postCSS modules here

//if (process.env.ENV === 'prod') plugins.push(require('cssnano'))

module.exports = {
    plugins,
}
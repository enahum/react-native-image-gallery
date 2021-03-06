import React, { PureComponent } from 'react';
import { View, Text, Image, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';
import ViewTransformer from '../ViewTransformer';

export default class TransformableImage extends PureComponent {
    static propTypes = {
        image: PropTypes.shape({
            source: PropTypes.oneOfType([
                PropTypes.object,
                PropTypes.number
            ]),
            dimensions: PropTypes.shape({ width: PropTypes.number, height: PropTypes.number })
        }).isRequired,
        pageId: PropTypes.number.isRequired,
        style: ViewPropTypes ? ViewPropTypes.style : View.propTypes.style,
        onLoad: PropTypes.func,
        onLoadStart: PropTypes.func,
        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        onTransformGestureReleased: PropTypes.func,
        onViewTransformed: PropTypes.func,
        onViewTransforming: PropTypes.func,
        imageComponent: PropTypes.func,
        resizeMode: PropTypes.string,
        errorComponent: PropTypes.func
    };

    static defaultProps = {
        enableTransform: true,
        enableScale: true,
        enableTranslate: true,
        imageComponent: undefined,
        resizeMode: 'contain'
    };

    constructor (props) {
        super(props);

        this.state = {
            viewWidth: 0,
            viewHeight: 0,
            imageLoaded: false,
            imageDimensions: props.image.dimensions,
            keyAcumulator: 1
        };
    }

    componentWillMount () {
        if (!this.state.imageDimensions) {
            this.getImageSize(this.props.image);
        }
    }

    componentDidMount () {
        this._mounted = true;
    }

    componentWillReceiveProps (nextProps) {
        if (!sameImage(this.props.image, nextProps.image)) {
            // image source changed, clear last image's imageDimensions info if any
            this.setState({ imageDimensions: nextProps.image.dimensions, keyAcumulator: this.state.keyAcumulator + 1, error: false });
            if (!nextProps.image.dimensions) { // if we don't have image dimensions provided in source
                this.getImageSize(nextProps.image);
            }
        }
    }

    componentWillUnmount () {
        this._mounted = false;
    }

    onLoadStart = (e) => {
        this.props.onLoadStart && this.props.onLoadStart(e);
        if (this.state.imageLoaded) {
            this.setState({ imageLoaded: false });
        }
    };

    onLoad = (e) => {
        this.props.onLoad && this.props.onLoad(e);
        if (!this.state.imageLoaded) {
            this.setState({ imageLoaded: true });
        }
    };

    onLayout = (e) => {
        let {width, height} = e.nativeEvent.layout;
        if (this.state.viewWidth !== width || this.state.viewHeight !== height) {
            this.setState({ viewWidth: width, viewHeight: height });
        }
    };

    getImageSize = (image) => {
        if (!image) {
            return;
        }
        const { source, dimensions } = image;

        if (dimensions) {
            this.setState({ imageDimensions: dimensions });
            return;
        }

        if (source && source.uri) {
            let getSize;
            let params = [source.uri];
            if (source.headers && Image.getSizeWithHeaders) {
                params.push(source.headers);
                getSize = Image.getSizeWithHeaders;
            } else {
                getSize = Image.getSize;
            }
            getSize(
                ...params,
                (width, height) => {
                    if (width && height) {
                        if (this.state.imageDimensions && this.state.imageDimensions.width === width && this.state.imageDimensions.height === height) {
                            // no need to update state
                        } else {
                            this._mounted && this.setState({ imageDimensions: { width, height } });
                        }
                    }
                },
                () => {
                    this._mounted && this.setState({ error: true });
                }
            );
        } else {
            this.setState({ error: true });
        }
    };

    getViewTransformerInstance = () => {
        return this.refs['viewTransformer'];
    };

    renderError () {
        return (this.props.errorComponent && this.props.errorComponent(this.props.pageId)) || (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 15, fontStyle: 'italic' }}>This image cannot be displayed...</Text>
            </View>
        );
    }

    render () {
        const { imageDimensions, viewWidth, viewHeight, error, keyAccumulator, imageLoaded } = this.state;
        const { style, image, imageComponent, resizeMode, enableTransform, enableScale, enableTranslate, onTransformGestureReleased, onViewTransformed, onViewTransforming } = this.props;

        let contentAspectRatio;
        let width, height; // imageDimensions

        if (imageDimensions) {
            width = imageDimensions.width;
            height = imageDimensions.height;
        }

        if (width && height) {
            contentAspectRatio = width / height;
        }

        const imageProps = {
            ...this.props,
            imageLoaded,
            source: image.source,
            style: [style, { backgroundColor: 'transparent' }],
            resizeMode: resizeMode,
            onLoadStart: this.onLoadStart,
            onLoad: this.onLoad,
            capInsets: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }
        };

        const content = imageComponent ? imageComponent(imageProps, imageDimensions) : <Image { ...imageProps } />;

        return (
            <ViewTransformer
                ref={'viewTransformer'}
                key={'viewTransformer#' + keyAccumulator} // when image source changes, we should use a different node to avoid reusing previous transform state
                enableTransform={enableTransform && imageLoaded} // disable transform until image is loaded
                enableScale={enableScale}
                enableTranslate={enableTranslate}
                enableResistance={true}
                onTransformGestureReleased={onTransformGestureReleased}
                onViewTransformed={onViewTransformed}
                onViewTransforming={onViewTransforming}
                maxScale={3}
                contentAspectRatio={contentAspectRatio}
                onLayout={this.onLayout}
                style={style}>
                { error ? this.renderError() : content }
            </ViewTransformer>
        );
    }
}

function sameImage (source, nextSource) {
    if (source === nextSource) {
        return true;
    }
    if (source && nextSource) {
        if (source.uri && nextSource.uri) {
            return source.uri === nextSource.uri;
        }
    }
    return false;
}

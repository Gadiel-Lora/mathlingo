import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

class BrainMascotWidget extends StatelessWidget {
  const BrainMascotWidget({
    super.key,
    this.width = 320,
    this.height,
    this.fit = BoxFit.contain,
    this.semanticsLabel = 'Mascota cerebro kawaii graduado',
  });

  final double width;
  final double? height;
  final BoxFit fit;
  final String semanticsLabel;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/brain-mascot-academic.flutter.svg',
      width: width,
      height: height,
      fit: fit,
      semanticsLabel: semanticsLabel,
    );
  }
}
